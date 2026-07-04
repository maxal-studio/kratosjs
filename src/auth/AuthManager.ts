import { Router, Request, Response } from 'express';
import { AuthProvider } from './AuthProvider';
import {
	AuthUser,
	AuthTokens,
	JWTConfig,
	AuthButtonConfig,
	AuthHooks,
	AuthHookContext,
	AuthChallengeProvider,
	LoginResult,
	SerializeUser,
	SerializeUserContext,
} from './types';
import { withNormalizedRole } from './normalizeRole';
import {
	generateAccessToken,
	generateRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
	getTokenExpiration,
	generateChallengeToken,
	verifyChallengeToken,
} from './jwt';
import crypto from 'crypto';
import { t } from '../i18n/serverT';

/**
 * AuthManager - Central manager for authentication
 * Handles provider registration, token generation, and auth routes
 */
export class AuthManager {
	private providers: Map<string, AuthProvider> = new Map();
	private jwtConfig: JWTConfig;
	/** Ordered login-flow lifecycle hooks (run for every provider). */
	private hooks: AuthHooks[] = [];
	/** Registered challenge providers, keyed by challenge type. */
	private challenges: Map<string, AuthChallengeProvider> = new Map();
	/** Maps a raw user entity to the public AuthUser. Identity until the panel configures one. */
	private _serializeUser: SerializeUser = user => user as AuthUser;
	/** Context passed to `_serializeUser`. Injected by the panel via `setUserShaping`. */
	private _serializeCtx: SerializeUserContext = {} as SerializeUserContext;
	/** Request-scoped user lookup by id (for /me, /refresh, /challenge). */
	private _getUserById?: (id: string) => Promise<AuthUser | null>;

	constructor(jwtConfig: JWTConfig) {
		this.jwtConfig = jwtConfig;
	}

	/**
	 * Configure how raw user entities become the public `AuthUser`, and how a user is
	 * loaded by id. Called by the panel during `auth()`. `serializeUser` is the single
	 * source of truth for the shape returned to the client across every provider and
	 * endpoint.
	 */
	setUserShaping(config: {
		serializeUser?: SerializeUser;
		serializeCtx?: SerializeUserContext;
		getUserById?: (id: string) => Promise<AuthUser | null>;
	}): void {
		if (config.serializeUser) this._serializeUser = config.serializeUser;
		if (config.serializeCtx) this._serializeCtx = config.serializeCtx;
		if (config.getUserById) this._getUserById = config.getUserById;
	}

	/** Shape a raw user entity into the public AuthUser, normalizing a role to its id if present. */
	private async serialize(entity: any): Promise<AuthUser> {
		const user = await this._serializeUser(entity, this._serializeCtx);
		return withNormalizedRole(user);
	}

	// ============================================================================
	// Extension registries (login-flow hooks + challenge protocol)
	// ============================================================================

	/**
	 * Register ordered lifecycle hooks around the login flow. Hooks run for every
	 * provider in registration order.
	 */
	registerHook(hooks: AuthHooks): void {
		this.hooks.push(hooks);
	}

	/**
	 * Register a challenge provider (high-level "interrupt with a verification step").
	 * Later registrations of the same `type` win.
	 */
	registerChallenge(challenge: AuthChallengeProvider): void {
		this.challenges.set(challenge.type, challenge);
	}

	/** Run a single lifecycle hook across all registrations, in order, awaiting each. */
	private async runHook(name: keyof AuthHooks, ...args: any[]): Promise<void> {
		for (const hook of this.hooks) {
			const fn = hook[name] as ((...a: any[]) => void | Promise<void>) | undefined;
			if (typeof fn === 'function') {
				await fn(...args);
			}
		}
	}

	private setAuthCookies(res: Response, tokens: AuthTokens): void {
		const override = this.jwtConfig.cookie ?? {};
		const base: any = {
			httpOnly: override.httpOnly ?? true,
			secure: override.secure ?? process.env.NODE_ENV === 'production',
			sameSite: override.sameSite ?? 'lax',
			path: '/',
		};
		if (override.domain) base.domain = override.domain;

		const accessMaxAge = getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m') * 1000;
		const refreshMaxAge = getTokenExpiration(this.jwtConfig.refreshTokenExpiry || '7d') * 1000;

		res.cookie('kratosjs_access_token', tokens.accessToken, { ...base, maxAge: accessMaxAge });
		res.cookie('kratosjs_refresh_token', tokens.refreshToken, {
			...base,
			maxAge: refreshMaxAge,
			path: '/auth/refresh',
		});
	}

	private clearAuthCookies(res: Response): void {
		const domain = this.jwtConfig.cookie?.domain;
		res.clearCookie('kratosjs_access_token', { path: '/', domain });
		res.clearCookie('kratosjs_refresh_token', { path: '/auth/refresh', domain });
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

		const entity = await provider.authenticate(credentials);
		if (!entity) {
			throw new Error(t('core:auth.invalid_credentials'));
		}

		return this.generateTokens(await this.serialize(entity));
	}

	// ============================================================================
	// Login pipeline (hooks + challenge protocol) — returns LoginResult, no `res`
	// ============================================================================

	/**
	 * Authenticate credentials and shape the raw entity the provider returned into a
	 * canonical AuthUser via `serializeUser` (which also normalizes the role to its id).
	 */
	private async resolveUser(providerName: string, credentials: any): Promise<AuthUser> {
		const provider = this.providers.get(providerName);
		if (!provider) {
			throw new Error(`Provider '${providerName}' not found`);
		}

		const entity = await provider.authenticate(credentials);
		if (!entity) {
			throw new Error(t('core:auth.invalid_credentials'));
		}

		return this.serialize(entity);
	}

	/**
	 * Full login attempt: run lifecycle hooks, authenticate, then either issue tokens
	 * or return a pending challenge. Provider-agnostic — challenges live above adapters.
	 */
	async attemptLogin(providerName: string, credentials: any, ctx: AuthHookContext): Promise<LoginResult> {
		await this.runHook('beforeAuthenticate', ctx);
		const user = await this.resolveUser(providerName, credentials);
		await this.runHook('afterAuthenticate', user, ctx);
		return this.resolveOrIssue(user, ctx);
	}

	/** Decide whether any challenge is required; if so pause and return the first one. */
	private async resolveOrIssue(user: AuthUser, ctx: AuthHookContext): Promise<LoginResult> {
		const pending: string[] = [];
		for (const challenge of this.challenges.values()) {
			if (await challenge.isRequired(user, ctx)) {
				pending.push(challenge.type);
			}
		}

		if (pending.length === 0) {
			return this.issueTokens(user, ctx);
		}

		const first = this.challenges.get(pending[0])!;
		const challengeToken = generateChallengeToken(
			{ userId: user.id, provider: ctx.provider, pending },
			this.jwtConfig,
		);
		return {
			status: 'challenge',
			challenge: {
				type: pending[0],
				challengeToken,
				data: await first.getChallengeData?.(user, ctx),
			},
		};
	}

	/**
	 * Verify the user's response to the active challenge. On success, either issue tokens
	 * (no challenges left) or return the next pending challenge.
	 */
	async verifyChallenge(
		challengeToken: string,
		type: string,
		payload: unknown,
		ctx: AuthHookContext,
		getUserById: (id: string) => Promise<AuthUser | null>,
	): Promise<LoginResult> {
		const decoded = verifyChallengeToken(challengeToken, this.jwtConfig.secret);
		if (!decoded || decoded.pending[0] !== type) {
			throw new Error(t('core:auth.invalid_challenge'));
		}

		const rawUser = await getUserById(decoded.userId);
		const challenge = this.challenges.get(type);
		if (!rawUser || !challenge) {
			throw new Error(t('core:auth.invalid_challenge'));
		}

		const user: AuthUser = withNormalizedRole(rawUser);
		const ok = await challenge.verify(user, payload, ctx);
		if (!ok) {
			throw new Error(t('core:auth.verification_failed'));
		}

		const remaining = decoded.pending.slice(1);
		if (remaining.length === 0) {
			return this.issueTokens(user, ctx);
		}

		const nextToken = generateChallengeToken(
			{ userId: user.id, provider: decoded.provider, pending: remaining },
			this.jwtConfig,
		);
		const next = this.challenges.get(remaining[0])!;
		return {
			status: 'challenge',
			challenge: {
				type: remaining[0],
				challengeToken: nextToken,
				data: await next.getChallengeData?.(user, ctx),
			},
		};
	}

	/** Run the issue-tokens hooks and produce an `authenticated` result. */
	private async issueTokens(user: AuthUser, ctx: AuthHookContext): Promise<LoginResult> {
		await this.runHook('beforeIssueTokens', user, ctx);
		const tokens = this.generateTokens(user);
		await this.runHook('afterIssueTokens', user, tokens, ctx);
		await this.runHook('onLoginSuccess', user, ctx);
		return { status: 'authenticated', user, tokens };
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
	 * Send a LoginResult to the client. Cookies are set ONLY for the `authenticated`
	 * branch; a pending `challenge` sets no auth cookies and echoes the challenge back.
	 */
	private respondWithResult(res: Response, result: LoginResult): void {
		if (result.status === 'authenticated') {
			this.setAuthCookies(res, result.tokens);
			res.json({
				status: 'authenticated',
				user: result.user,
				tokens: { expiresIn: result.tokens.expiresIn },
			});
			return;
		}

		// challenge: no cookies, return the continuation token + non-secret data
		res.json(result);
	}

	/**
	 * Get Express router with all auth routes
	 * @param getUserById - request-scoped user lookup (for /me, /refresh, /challenge)
	 * @param getEm - request-scoped EntityManager accessor (passed to auth hooks/challenges)
	 */
	getRoutes(getUserById?: (id: string) => Promise<AuthUser | null>, getEm?: () => any): Router {
		const router = Router();

		// Store getUserById for use in route handlers
		const _getUserById = getUserById || this._getUserById;
		const _getEm = getEm || (() => undefined);

		// GET /auth/providers - List available providers
		router.get('/providers', (_req: Request, res: Response) => {
			try {
				const providers = this.getProviderButtons();
				res.json({ providers });
			} catch (error: any) {
				res.status(500).json({ error: error.message || 'Failed to get providers' });
			}
		});

		// POST /auth/login - Login with provider (may return a pending challenge)
		router.post('/login', async (req: Request, res: Response): Promise<void> => {
			const { provider, ...credentials } = req.body;
			const ctx: AuthHookContext = { provider, req, credentials, getEm: _getEm };
			try {
				if (!provider) {
					res.status(400).json({ error: t('core:auth.provider_required') });
					return;
				}

				const result = await this.attemptLogin(provider, credentials, ctx);
				this.respondWithResult(res, result);
			} catch (error: any) {
				await this.runHook('onLoginFailure', error, ctx);
				res.status(401).json({ error: error.message || 'Login failed' });
			}
		});

		// POST /auth/challenge - Respond to a pending login challenge (e.g. a one-time code)
		router.post('/challenge', async (req: Request, res: Response): Promise<void> => {
			const { challengeToken, type, payload } = req.body;
			// Derive provider from the (verified) challenge token for the hook context.
			const decoded = verifyChallengeToken(challengeToken, this.jwtConfig.secret);
			const ctx: AuthHookContext = {
				provider: decoded?.provider ?? 'unknown',
				req,
				getEm: _getEm,
			};
			try {
				if (!challengeToken || !type) {
					res.status(400).json({ error: t('core:auth.challenge_fields_required') });
					return;
				}
				if (!_getUserById) {
					res.status(500).json({ error: t('core:auth.user_lookup_not_configured') });
					return;
				}

				const result = await this.verifyChallenge(challengeToken, type, payload, ctx, _getUserById);
				this.respondWithResult(res, result);
			} catch (error: any) {
				await this.runHook('onLoginFailure', error, ctx);
				res.status(401).json({ error: error.message || 'Challenge verification failed' });
			}
		});

		// GET /auth/me - Get current user
		router.get('/me', async (req: Request, res: Response): Promise<void> => {
			try {
				const token = this.extractToken(req);
				if (!token) {
					res.status(401).json({ error: t('core:auth.no_token') });
					return;
				}

				// Decode token to get user ID
				const tokenUser = await this.getCurrentUser(token);
				if (!tokenUser) {
					res.status(401).json({ error: t('core:auth.invalid_token') });
					return;
				}

				// If getUserById is provided, fetch full user data (including resolved media URLs)
				// Otherwise, return the user from token
				let user = tokenUser;
				if (_getUserById) {
					const fullUser = await _getUserById(tokenUser.id);
					if (fullUser) {
						// `role` (if any) may be a relation reference/entity; expose its id consistently.
						user = withNormalizedRole(fullUser);
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
					res.status(500).json({ error: t('core:auth.user_lookup_not_configured') });
					return;
				}

				const refreshToken = req.body.refreshToken || req.cookies?.['kratosjs_refresh_token'];
				if (!refreshToken) {
					res.status(400).json({ error: t('core:auth.refresh_token_required') });
					return;
				}

				const tokens = await this.refresh(refreshToken, getUserById);
				if (!tokens) {
					res.status(401).json({ error: t('core:auth.invalid_refresh_token') });
					return;
				}

				this.setAuthCookies(res, tokens);

				res.json({ tokens: { expiresIn: tokens.expiresIn } });
			} catch (error: any) {
				res.status(401).json({ error: error.message || 'Token refresh failed' });
			}
		});

		// POST /auth/logout - Logout (clear tokens)
		router.post('/logout', async (req: Request, res: Response): Promise<void> => {
			const ctx: AuthHookContext = { provider: 'unknown', req, getEm: _getEm };
			await this.runHook('beforeLogout', ctx);
			this.clearAuthCookies(res);
			await this.runHook('afterLogout', ctx);
			res.json({ message: t('core:auth.logged_out') });
		});

		// GET /auth/oauth/:provider - Initiate OAuth flow
		router.get('/oauth/:provider', (req: Request, res: Response) => {
			try {
				const provider = req.params.provider as string;
				const authProvider = this.getProvider(provider);

				if (!authProvider) {
					res.status(404).json({ error: t('core:auth.provider_not_found', { provider }) });
					return;
				}

				if (!authProvider.getAuthorizationUrl) {
					res.status(400).json({ error: t('core:auth.provider_no_oauth', { provider }) });
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
					res.status(400).json({ error: t('core:auth.missing_oauth_params') });
					return;
				}

				const authProvider = this.getProvider(provider);
				if (!authProvider) {
					res.status(404).json({ error: t('core:auth.provider_not_found', { provider }) });
					return;
				}

				if (!authProvider.handleCallback) {
					res.status(400).json({ error: t('core:auth.provider_no_oauth_callback', { provider }) });
					return;
				}

				// Verify state from cookie
				const storedState = req.cookies?.[`oauth_state_${provider}`];
				if (!storedState || storedState !== state) {
					res.status(400).json({ error: t('core:auth.invalid_state') });
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

				// Handle OAuth callback — provider returns the raw entity; shape it the
				// same way the credentials flow does, via serializeUser.
				const entity = await authProvider.handleCallback(code as string, state as string);
				if (!entity) {
					res.status(401).json({ error: t('core:auth.oauth_failed') });
					return;
				}
				const user = await this.serialize(entity);

				// Generate tokens
				const tokens = {
					accessToken: generateAccessToken(user, this.jwtConfig),
					refreshToken: generateRefreshToken(user, this.jwtConfig),
					expiresIn: getTokenExpiration(this.jwtConfig.accessTokenExpiry || '15m'),
				};

				this.setAuthCookies(res, tokens);

				// Redirect to frontend — cookies carry the session, no tokens in URL
				const finalRedirectUri = redirectUri || req.protocol + '://' + req.get('host') + '/';
				res.redirect(finalRedirectUri);
			} catch (error: any) {
				res.status(500).json({ error: error.message || 'OAuth callback failed' });
			}
		});

		return router;
	}
}
