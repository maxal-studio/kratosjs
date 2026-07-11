import type { HttpMethod, KratosHandler, KratosReply, KratosRequest } from '../http/types';
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
	/**
	 * Full URL prefix where the auth router is actually mounted (e.g. `/kratosjs/api/auth`).
	 * The panel injects it via {@link getRoutes} so the refresh-token cookie can be scoped to
	 * the real refresh endpoint. A browser only returns a cookie whose `path` prefixes the
	 * request URL, so this MUST match the mount — otherwise the cookie is never sent and every
	 * refresh silently fails. Defaults to `/auth` (unprefixed mount).
	 */
	private authMountPath = '/auth';

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

	private setAuthCookies(reply: KratosReply, tokens: AuthTokens): void {
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

		reply.cookie('kratosjs_access_token', tokens.accessToken, { ...base, maxAge: accessMaxAge });
		reply.cookie('kratosjs_refresh_token', tokens.refreshToken, {
			...base,
			maxAge: refreshMaxAge,
			path: this.refreshCookiePath,
		});
	}

	private clearAuthCookies(reply: KratosReply): void {
		const domain = this.jwtConfig.cookie?.domain;
		reply.clearCookie('kratosjs_access_token', { path: '/', domain });
		reply.clearCookie('kratosjs_refresh_token', { path: this.refreshCookiePath, domain });
	}

	/**
	 * Path the refresh-token cookie is scoped to — the actual mounted refresh endpoint
	 * (`{authMountPath}/refresh`, e.g. `/kratosjs/api/auth/refresh`). Must equal the URL the
	 * client POSTs to, or the browser withholds the cookie and refresh always fails.
	 */
	private get refreshCookiePath(): string {
		return `${this.authMountPath}/refresh`;
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
	private extractToken(req: KratosRequest): string | null {
		// Try Authorization header first
		const authHeader = req.header('authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}

		// Try cookie
		if (req.cookies['kratosjs_access_token']) {
			return req.cookies['kratosjs_access_token'];
		}

		return null;
	}

	/**
	 * Send a LoginResult to the client. Cookies are set ONLY for the `authenticated`
	 * branch; a pending `challenge` sets no auth cookies and echoes the challenge back.
	 */
	private respondWithResult(reply: KratosReply, result: LoginResult): void {
		if (result.status === 'authenticated') {
			this.setAuthCookies(reply, result.tokens);
			reply.json({
				status: 'authenticated',
				user: result.user,
				tokens: { expiresIn: result.tokens.expiresIn },
			});
			return;
		}

		// challenge: no cookies, return the continuation token + non-secret data
		reply.json(result);
	}

	/**
	 * Get the auth route definitions (framework-neutral, relative paths).
	 * The panel prefixes them with `${basePath}/auth` and composes each handler
	 * into the shared pipeline (ORM + locale context — auth routes require no auth).
	 *
	 * @param getUserById - request-scoped user lookup (for /me, /refresh, /challenge)
	 * @param getEm - request-scoped EntityManager accessor (passed to auth hooks/challenges)
	 * @param basePath - URL prefix the routes are mounted under (the panel's base path, e.g.
	 *   `/kratosjs/api`). Used to scope the refresh-token cookie to the real refresh endpoint.
	 */
	getRouteDefinitions(
		getUserById?: (id: string) => Promise<AuthUser | null>,
		getEm?: () => any,
		basePath = '',
	): Array<{ method: HttpMethod; path: string; handler: KratosHandler }> {
		// Routes are mounted at `${basePath}/auth`; record the full prefix so the
		// refresh-token cookie's path matches the endpoint the client actually calls.
		this.authMountPath = `${basePath}/auth`;

		// Store getUserById for use in route handlers
		const _getUserById = getUserById || this._getUserById;
		const _getEm = getEm || (() => undefined);

		const routes: Array<{ method: HttpMethod; path: string; handler: KratosHandler }> = [];

		// GET /auth/providers - List available providers
		routes.push({
			method: 'GET',
			path: '/providers',
			handler: (_req, reply) => {
				try {
					const providers = this.getProviderButtons();
					reply.json({ providers });
				} catch (error: any) {
					reply.status(500).json({ error: error.message || 'Failed to get providers' });
				}
			},
		});

		// POST /auth/login - Login with provider (may return a pending challenge)
		routes.push({
			method: 'POST',
			path: '/login',
			handler: async (req, reply) => {
				const { provider, ...credentials } = req.body;
				const ctx: AuthHookContext = { provider, req, credentials, getEm: _getEm };
				try {
					if (!provider) {
						reply.status(400).json({ error: t('core:auth.provider_required') });
						return;
					}

					const result = await this.attemptLogin(provider, credentials, ctx);
					this.respondWithResult(reply, result);
				} catch (error: any) {
					await this.runHook('onLoginFailure', error, ctx);
					reply.status(401).json({ error: error.message || 'Login failed' });
				}
			},
		});

		// POST /auth/challenge - Respond to a pending login challenge (e.g. a one-time code)
		routes.push({
			method: 'POST',
			path: '/challenge',
			handler: async (req, reply) => {
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
						reply.status(400).json({ error: t('core:auth.challenge_fields_required') });
						return;
					}
					if (!_getUserById) {
						reply.status(500).json({ error: t('core:auth.user_lookup_not_configured') });
						return;
					}

					const result = await this.verifyChallenge(challengeToken, type, payload, ctx, _getUserById);
					this.respondWithResult(reply, result);
				} catch (error: any) {
					await this.runHook('onLoginFailure', error, ctx);
					reply.status(401).json({ error: error.message || 'Challenge verification failed' });
				}
			},
		});

		// GET /auth/me - Get current user
		routes.push({
			method: 'GET',
			path: '/me',
			handler: async (req, reply) => {
				try {
					const token = this.extractToken(req);
					if (!token) {
						reply.status(401).json({ error: t('core:auth.no_token') });
						return;
					}

					// Decode token to get user ID
					const tokenUser = await this.getCurrentUser(token);
					if (!tokenUser) {
						reply.status(401).json({ error: t('core:auth.invalid_token') });
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

					reply.json({ user });
				} catch (error: any) {
					reply.status(401).json({ error: error.message || 'Authentication failed' });
				}
			},
		});

		// POST /auth/refresh - Refresh access token
		routes.push({
			method: 'POST',
			path: '/refresh',
			handler: async (req, reply) => {
				try {
					if (!getUserById) {
						reply.status(500).json({ error: t('core:auth.user_lookup_not_configured') });
						return;
					}

					const refreshToken = req.body?.refreshToken || req.cookies['kratosjs_refresh_token'];
					if (!refreshToken) {
						reply.status(400).json({ error: t('core:auth.refresh_token_required') });
						return;
					}

					const tokens = await this.refresh(refreshToken, getUserById);
					if (!tokens) {
						reply.status(401).json({ error: t('core:auth.invalid_refresh_token') });
						return;
					}

					this.setAuthCookies(reply, tokens);

					reply.json({ tokens: { expiresIn: tokens.expiresIn } });
				} catch (error: any) {
					reply.status(401).json({ error: error.message || 'Token refresh failed' });
				}
			},
		});

		// POST /auth/logout - Logout (clear tokens)
		routes.push({
			method: 'POST',
			path: '/logout',
			handler: async (req, reply) => {
				const ctx: AuthHookContext = { provider: 'unknown', req, getEm: _getEm };
				await this.runHook('beforeLogout', ctx);
				this.clearAuthCookies(reply);
				await this.runHook('afterLogout', ctx);
				reply.json({ message: t('core:auth.logged_out') });
			},
		});

		// GET /auth/oauth/:provider - Initiate OAuth flow
		routes.push({
			method: 'GET',
			path: '/oauth/:provider',
			handler: (req, reply) => {
				try {
					const provider = req.params.provider;
					const authProvider = this.getProvider(provider);

					if (!authProvider) {
						reply.status(404).json({ error: t('core:auth.provider_not_found', { provider }) });
						return;
					}

					if (!authProvider.getAuthorizationUrl) {
						reply.status(400).json({ error: t('core:auth.provider_no_oauth', { provider }) });
						return;
					}

					// Generate state for CSRF protection
					const state = crypto.randomBytes(32).toString('hex');

					// Get redirect_uri from query params (frontend URL to redirect back to)
					const redirectUri = (req.query.redirect_uri as string) || null;

					// Store state and redirect_uri in cookie for verification
					reply.cookie(`oauth_state_${provider}`, state, {
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						sameSite: 'lax',
						maxAge: 600000, // 10 minutes
						path: '/', // Ensure cookie is accessible from all paths
					});

					// Store redirect_uri in cookie if provided
					if (redirectUri) {
						reply.cookie(`oauth_redirect_uri_${provider}`, redirectUri, {
							httpOnly: true,
							secure: process.env.NODE_ENV === 'production',
							sameSite: 'lax',
							maxAge: 600000, // 10 minutes
							path: '/',
						});
					}

					const authorizationUrl = authProvider.getAuthorizationUrl(state);

					reply.redirect(authorizationUrl);
				} catch (error: any) {
					reply.status(500).json({ error: error.message || 'Failed to initiate OAuth flow' });
				}
			},
		});

		// GET /auth/oauth/:provider/callback - Handle OAuth callback
		routes.push({
			method: 'GET',
			path: '/oauth/:provider/callback',
			handler: async (req, reply) => {
				try {
					const provider = req.params.provider;
					const { code, state } = req.query;

					if (!code || !state) {
						reply.status(400).json({ error: t('core:auth.missing_oauth_params') });
						return;
					}

					const authProvider = this.getProvider(provider);
					if (!authProvider) {
						reply.status(404).json({ error: t('core:auth.provider_not_found', { provider }) });
						return;
					}

					if (!authProvider.handleCallback) {
						reply.status(400).json({ error: t('core:auth.provider_no_oauth_callback', { provider }) });
						return;
					}

					// Verify state from cookie
					const storedState = req.cookies[`oauth_state_${provider}`];
					if (!storedState || storedState !== state) {
						reply.status(400).json({ error: t('core:auth.invalid_state') });
						return;
					}

					// Clear state cookie (use same options as when setting)
					reply.clearCookie(`oauth_state_${provider}`, {
						path: '/',
					});

					// Get redirect_uri from cookie (frontend URL to redirect back to)
					const redirectUri = req.cookies[`oauth_redirect_uri_${provider}`] || null;

					// Clear redirect_uri cookie
					if (redirectUri) {
						reply.clearCookie(`oauth_redirect_uri_${provider}`, {
							path: '/',
						});
					}

					// Handle OAuth callback — provider returns the raw entity; shape it the
					// same way the credentials flow does, via serializeUser.
					const entity = await authProvider.handleCallback(code as string, state as string);
					if (!entity) {
						reply.status(401).json({ error: t('core:auth.oauth_failed') });
						return;
					}
					const user = await this.serialize(entity);

					// Generate tokens
					const tokens = this.generateTokens(user);

					this.setAuthCookies(reply, tokens);

					// Redirect to frontend — cookies carry the session, no tokens in URL
					const finalRedirectUri = redirectUri || `${req.protocol}://${req.host}/`;
					reply.redirect(finalRedirectUri);
				} catch (error: any) {
					reply.status(500).json({ error: error.message || 'OAuth callback failed' });
				}
			},
		});

		return routes;
	}
}
