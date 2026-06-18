import { Router, Request, Response } from 'express';
import { AuthProvider } from './AuthProvider';
import { AuthUser, AuthTokens, JWTConfig, AuthButtonConfig } from './types';
import { normalizeRoleId } from './normalizeRole';
import {
	generateAccessToken,
	generateRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
	getTokenExpiration,
} from './jwt';
import crypto from 'crypto';

/**
 * AuthManager - Central manager for authentication
 * Handles provider registration, token generation, and auth routes
 */
export class AuthManager {
	private providers: Map<string, AuthProvider> = new Map();
	private jwtConfig: JWTConfig;

	constructor(jwtConfig: JWTConfig) {
		this.jwtConfig = jwtConfig;
	}

	/**
	 * Register an authentication provider
	 */
	registerProvider(provider: AuthProvider): void {
		this.providers.set(provider.getName(), provider);
	}

	/**
	 * Get a provider by name
	 */
	getProvider(name: string): AuthProvider | undefined {
		return this.providers.get(name);
	}

	/**
	 * Get all registered providers
	 */
	getAllProviders(): AuthProvider[] {
		return Array.from(this.providers.values());
	}

	/**
	 * Get button configurations for all providers (for frontend)
	 */
	getProviderButtons(): AuthButtonConfig[] {
		return this.getAllProviders().map(provider => provider.getButtonConfig());
	}

	/**
	 * Login with a provider
	 */
	async login(providerName: string, credentials: any): Promise<AuthTokens> {
		const provider = this.providers.get(providerName);
		if (!provider) {
			throw new Error(`Provider '${providerName}' not found`);
		}

		const user = await provider.authenticate(credentials);
		if (!user) {
			throw new Error('Invalid credentials');
		}

		return this.generateTokens(user);
	}

	/**
	 * Generate access and refresh tokens for a user
	 */
	generateTokens(user: AuthUser): AuthTokens {
		const accessToken = generateAccessToken(user, this.jwtConfig);
		const refreshToken = generateRefreshToken(user, this.jwtConfig);
		const expiresIn = getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m');

		return {
			accessToken,
			refreshToken,
			expiresIn,
		};
	}

	/**
	 * Get current user from access token
	 */
	async getCurrentUser(accessToken: string): Promise<AuthUser | null> {
		return verifyAccessToken(accessToken, this.jwtConfig.secret);
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refresh(
		refreshToken: string,
		getUserById: (id: string) => Promise<AuthUser | null>,
	): Promise<AuthTokens | null> {
		const decoded = verifyRefreshToken(refreshToken, this.jwtConfig.secret);
		if (!decoded) {
			return null;
		}

		const user = await getUserById(decoded.userId);
		if (!user) {
			return null;
		}

		return this.generateTokens(user);
	}

	/**
	 * Extract token from request (header or cookie)
	 */
	private extractToken(req: Request): string | null {
		// Try Authorization header first
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}

		// Try cookie
		if (req.cookies && req.cookies['kratosjs_access_token']) {
			return req.cookies['kratosjs_access_token'];
		}

		return null;
	}

	/**
	 * Get Express router with all auth routes
	 */
	getRoutes(getUserById?: (id: string) => Promise<AuthUser | null>): Router {
		const router = Router();

		// Store getUserById for use in route handlers
		const _getUserById = getUserById || (this as any)._getUserById;

		// GET /auth/providers - List available providers
		router.get('/providers', (_req: Request, res: Response) => {
			try {
				const providers = this.getProviderButtons();
				res.json({ providers });
			} catch (error: any) {
				res.status(500).json({ error: error.message || 'Failed to get providers' });
			}
		});

		// POST /auth/login - Login with provider
		router.post('/login', async (req: Request, res: Response): Promise<void> => {
			try {
				const { provider, ...credentials } = req.body;

				if (!provider) {
					res.status(400).json({ error: 'Provider name is required' });
					return;
				}

				const tokens = await this.login(provider, credentials);

				// Decode token to get user ID
				const tokenUser = await this.getCurrentUser(tokens.accessToken);
				if (!tokenUser) {
					res.status(500).json({ error: 'Failed to get user after login' });
					return;
				}

				// If getUserById is provided, fetch full user data (including resolved media URLs)
				// Otherwise, use the user from token
				let user = tokenUser;
				if (_getUserById) {
					const fullUser = await _getUserById(tokenUser.id);
					if (fullUser) {
						// `role` may be a relation reference/entity; expose its id consistently.
						user = { ...fullUser, role: normalizeRoleId(fullUser.role) };
					}
				}

				// Set cookies if configured
				if (this.jwtConfig.cookie) {
					const cookieOptions: any = {
						httpOnly: this.jwtConfig.cookie.httpOnly ?? true,
						secure: this.jwtConfig.cookie.secure ?? false,
						sameSite: this.jwtConfig.cookie.sameSite || 'lax',
						path: '/',
					};

					if (this.jwtConfig.cookie.domain) {
						cookieOptions.domain = this.jwtConfig.cookie.domain;
					}

					const expiresIn = getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m');
					const refreshExpiresIn = getTokenExpiration(this.jwtConfig.refreshTokenExpiry || '7d');

					res.cookie('kratosjs_access_token', tokens.accessToken, {
						...cookieOptions,
						maxAge: expiresIn * 1000,
					});

					res.cookie('kratosjs_refresh_token', tokens.refreshToken, {
						...cookieOptions,
						maxAge: refreshExpiresIn * 1000,
					});
				}

				res.json({
					user,
					tokens,
				});
			} catch (error: any) {
				res.status(401).json({ error: error.message || 'Login failed' });
			}
		});

		// GET /auth/me - Get current user
		router.get('/me', async (req: Request, res: Response): Promise<void> => {
			try {
				const token = this.extractToken(req);
				if (!token) {
					res.status(401).json({ error: 'No token provided' });
					return;
				}

				// Decode token to get user ID
				const tokenUser = await this.getCurrentUser(token);
				if (!tokenUser) {
					res.status(401).json({ error: 'Invalid or expired token' });
					return;
				}

				// If getUserById is provided, fetch full user data (including resolved media URLs)
				// Otherwise, return the user from token
				let user = tokenUser;
				if (_getUserById) {
					const fullUser = await _getUserById(tokenUser.id);
					if (fullUser) {
						// `role` may be a relation reference/entity; expose its id consistently.
						user = { ...fullUser, role: normalizeRoleId(fullUser.role) };
					}
				}

				res.json({ user });
			} catch (error: any) {
				res.status(401).json({ error: error.message || 'Authentication failed' });
			}
		});

		// POST /auth/refresh - Refresh access token
		router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
			try {
				if (!getUserById) {
					res.status(500).json({ error: 'User lookup function not configured' });
					return;
				}

				const refreshToken = req.body.refreshToken || req.cookies?.['kratosjs_refresh_token'];
				if (!refreshToken) {
					res.status(400).json({ error: 'Refresh token is required' });
					return;
				}

				const tokens = await this.refresh(refreshToken, getUserById);
				if (!tokens) {
					res.status(401).json({ error: 'Invalid or expired refresh token' });
					return;
				}

				// Set new cookies if configured
				if (this.jwtConfig.cookie) {
					const cookieOptions: any = {
						httpOnly: this.jwtConfig.cookie.httpOnly ?? true,
						secure: this.jwtConfig.cookie.secure ?? false,
						sameSite: this.jwtConfig.cookie.sameSite || 'lax',
						path: '/',
					};

					if (this.jwtConfig.cookie.domain) {
						cookieOptions.domain = this.jwtConfig.cookie.domain;
					}

					const expiresIn = getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m');
					const refreshExpiresIn = getTokenExpiration(this.jwtConfig.refreshTokenExpiry || '7d');

					res.cookie('kratosjs_access_token', tokens.accessToken, {
						...cookieOptions,
						maxAge: expiresIn * 1000,
					});

					res.cookie('kratosjs_refresh_token', tokens.refreshToken, {
						...cookieOptions,
						maxAge: refreshExpiresIn * 1000,
					});
				}

				res.json({ tokens });
			} catch (error: any) {
				res.status(401).json({ error: error.message || 'Token refresh failed' });
			}
		});

		// POST /auth/logout - Logout (clear tokens)
		router.post('/logout', (_req: Request, res: Response) => {
			// Clear cookies if they exist
			if (this.jwtConfig.cookie) {
				res.clearCookie('kratosjs_access_token', {
					path: '/',
					domain: this.jwtConfig.cookie.domain,
				});
				res.clearCookie('kratosjs_refresh_token', {
					path: '/',
					domain: this.jwtConfig.cookie.domain,
				});
			}

			res.json({ message: 'Logged out successfully' });
		});

		// GET /auth/oauth/:provider - Initiate OAuth flow
		router.get('/oauth/:provider', (req: Request, res: Response) => {
			try {
				const provider = req.params.provider as string;
				const authProvider = this.getProvider(provider);

				if (!authProvider) {
					res.status(404).json({ error: `Provider "${provider}" not found` });
					return;
				}

				if (!authProvider.getAuthorizationUrl) {
					res.status(400).json({ error: `Provider "${provider}" does not support OAuth` });
					return;
				}

				// Generate state for CSRF protection
				const state = crypto.randomBytes(32).toString('hex');

				// Get redirect_uri from query params (frontend URL to redirect back to)
				const redirectUri = (req.query.redirect_uri as string) || null;

				// Store state and redirect_uri in cookie for verification
				res.cookie(`oauth_state_${provider}`, state, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					maxAge: 600000, // 10 minutes
					path: '/', // Ensure cookie is accessible from all paths
				});

				// Store redirect_uri in cookie if provided
				if (redirectUri) {
					res.cookie(`oauth_redirect_uri_${provider}`, redirectUri, {
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						sameSite: 'lax',
						maxAge: 600000, // 10 minutes
						path: '/',
					});
				}

				// Store state in session or cookie (for production, use proper session storage)
				// For now, we'll pass it in the redirect and verify in callback
				const authorizationUrl = authProvider.getAuthorizationUrl(state);

				res.redirect(authorizationUrl);
			} catch (error: any) {
				res.status(500).json({ error: error.message || 'Failed to initiate OAuth flow' });
			}
		});

		// GET /auth/oauth/:provider/callback - Handle OAuth callback
		router.get('/oauth/:provider/callback', async (req: Request, res: Response): Promise<void> => {
			try {
				const provider = req.params.provider as string;
				const { code, state } = req.query;

				if (!code || !state) {
					res.status(400).json({ error: 'Missing code or state parameter' });
					return;
				}

				const authProvider = this.getProvider(provider);
				if (!authProvider) {
					res.status(404).json({ error: `Provider "${provider}" not found` });
					return;
				}

				if (!authProvider.handleCallback) {
					res.status(400).json({ error: `Provider "${provider}" does not support OAuth callback` });
					return;
				}

				// Verify state from cookie
				const storedState = req.cookies?.[`oauth_state_${provider}`];
				if (!storedState || storedState !== state) {
					res.status(400).json({ error: 'Invalid state parameter' });
					return;
				}

				// Clear state cookie (use same options as when setting)
				res.clearCookie(`oauth_state_${provider}`, {
					path: '/',
				});

				// Get redirect_uri from cookie (frontend URL to redirect back to)
				const redirectUri = req.cookies?.[`oauth_redirect_uri_${provider}`] || null;

				// Clear redirect_uri cookie
				if (redirectUri) {
					res.clearCookie(`oauth_redirect_uri_${provider}`, {
						path: '/',
					});
				}

				// Handle OAuth callback
				const user = await authProvider.handleCallback(code as string, state as string);
				if (!user) {
					res.status(401).json({ error: 'OAuth authentication failed' });
					return;
				}

				// Generate tokens
				const tokens = {
					accessToken: generateAccessToken(user, this.jwtConfig),
					refreshToken: generateRefreshToken(user, this.jwtConfig),
					expiresIn: getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m'),
				};

				// Set cookies if configured
				if (this.jwtConfig.cookie) {
					const cookieOptions: any = {
						httpOnly: this.jwtConfig.cookie.httpOnly ?? true,
						secure: this.jwtConfig.cookie.secure ?? false,
						sameSite: this.jwtConfig.cookie.sameSite || 'lax',
						path: '/',
					};

					if (this.jwtConfig.cookie.domain) {
						cookieOptions.domain = this.jwtConfig.cookie.domain;
					}

					const expiresIn = getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m');
					const refreshExpiresIn = getTokenExpiration(this.jwtConfig.refreshTokenExpiry || '7d');

					res.cookie('kratosjs_access_token', tokens.accessToken, {
						...cookieOptions,
						maxAge: expiresIn * 1000,
					});

					res.cookie('kratosjs_refresh_token', tokens.refreshToken, {
						...cookieOptions,
						maxAge: refreshExpiresIn * 1000,
					});
				}

				// Redirect to frontend with tokens in query params
				// Use the redirect_uri from cookie if available, otherwise default to backend root
				const finalRedirectUri = redirectUri || req.protocol + '://' + req.get('host') + '/';
				const redirectUrl = new URL(finalRedirectUri);
				redirectUrl.searchParams.set('access_token', tokens.accessToken);
				redirectUrl.searchParams.set('refresh_token', tokens.refreshToken);

				res.redirect(redirectUrl.toString());
			} catch (error: any) {
				res.status(500).json({ error: error.message || 'OAuth callback failed' });
			}
		});

		return router;
	}
}
