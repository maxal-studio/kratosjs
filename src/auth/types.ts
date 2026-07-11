/**
 * Authenticated user interface
 */
export interface AuthUser {
	/** Unique identifier */
	id: string;
	/** Email address */
	email: string;
	/** Display name */
	name?: string;
	/** Role/title (e.g., 'admin', 'editor') */
	role?: string;
	/** Avatar image URL */
	avatarUrl?: string;
	/** Preferred theme */
	theme?: string;
	/** Provider-specific metadata */
	_auth?: {
		provider: string;
		providerId?: string;
		[key: string]: any;
	};
	/** Additional custom fields */
	[key: string]: any;
}

/**
 * Maps the conventional user fields the default email/credential flow reads to the
 * actual property names on your user entity. Every field is optional; unset fields
 * fall back to the convention shown.
 */
export interface UserFieldMap {
	/** Email / login field. Default: `email`. */
	email?: string;
	/** Hashed password field. Default: `password`. */
	password?: string;
	/** First name field (used to build the display name). Default: `firstname`. */
	firstname?: string;
	/** Last name field (used to build the display name). Default: `lastname`. */
	lastname?: string;
	/** Avatar / profile image field (a media value). Default: `profileMediaImage`. */
	image?: string;
	/** Role field (relation or scalar). Default: `role`. */
	role?: string;
}

/** Resolved field map with every key present (defaults applied). */
export type ResolvedUserFieldMap = Required<UserFieldMap>;

/**
 * Context handed to a provider's `bindPanelDefaults()` so it can implement the
 * default credential flow without importing the Panel (avoids a circular import).
 */
export interface AuthDefaultsContext {
	/** The user entity the defaults query. */
	userEntity: unknown;
	/** Resolved field-name map. */
	fields: ResolvedUserFieldMap;
	/** Request-scoped EntityManager accessor. */
	getEm: () => any;
	/** Active driver kind, for primary-key shaping. */
	getDriverKind: () => 'mongo' | 'sql';
	/** Verify a plaintext password against a stored hash. */
	verifyPassword: (plain: string, hash: string | undefined | null) => Promise<boolean>;
}

/**
 * Context handed to a `serializeUser` mapper: everything it needs to turn a raw
 * user entity into the public {@link AuthUser}. The same context is used for the
 * login flow, OAuth callbacks, and the `/me` / `/refresh` lookups.
 */
export interface SerializeUserContext {
	/** Resolved field-name map (email/password/firstname/lastname/image/role). */
	fields: ResolvedUserFieldMap;
	/** Resolve a stored media value (e.g. the avatar field) to a URL. */
	resolveMediaUrl: (value: any) => Promise<string | undefined>;
	/** Request-scoped EntityManager accessor. */
	getEm: () => any;
}

/**
 * Turns a raw user entity (the DB row a provider authenticated, or a row loaded by
 * id) into the public {@link AuthUser} returned to the client. Configure it once on
 * `panel.auth({ serializeUser })` to shape the user for every provider and every
 * endpoint — adding a column is a one-line change here, not per provider.
 */
export type SerializeUser = (user: any, ctx: SerializeUserContext) => AuthUser | Promise<AuthUser>;

/**
 * Additive counterpart to {@link SerializeUser}: return extra fields to **merge over** the
 * base serialized user, instead of rewriting the whole mapping. Configure it once on
 * `panel.auth({ extendUser })` to expose a couple of extra columns without copying the
 * default shape. Runs after the base serializer (default or a custom `serializeUser`) and
 * can override its keys. The returned fields are part of the client user AND the access
 * token, so keep them identity-sized and non-secret.
 */
export type ExtendUser = (user: any, ctx: SerializeUserContext) => Record<string, any> | Promise<Record<string, any>>;

/**
 * Authentication tokens
 */
export interface AuthTokens {
	/** JWT access token */
	accessToken: string;
	/** JWT refresh token */
	refreshToken: string;
	/** Access token expiration in seconds */
	expiresIn: number;
}

/**
 * Context passed to every auth hook and challenge callback. Lives at the AuthManager
 * level, so it is provider-agnostic — the same hooks run for email, OAuth, or any custom
 * provider.
 */
export interface AuthHookContext {
	/** Provider name that authenticated (or attempted to). */
	provider: string;
	/**
	 * Framework-neutral request (ip, headers, body, cookies) — for rate-limit / audit /
	 * captcha. The framework-native request is available as `req.raw`.
	 */
	req: import('../http/types').KratosRequest;
	/** Login credentials. Only populated for `beforeAuthenticate`. */
	credentials?: any;
	/** Request-scoped EntityManager accessor. */
	getEm: () => any;
}

/**
 * Ordered lifecycle hooks around the login flow. All optional and all async-capable.
 * Hooks run for every provider because they are registered on the AuthManager, not on
 * any individual adapter. Throwing from `beforeAuthenticate` rejects the login.
 */
export interface AuthHooks {
	/** Optional name (for debugging / ordering insight). */
	name?: string;
	/** Before credentials are checked. May throw to reject (e.g. rate limit, captcha). */
	beforeAuthenticate?(ctx: AuthHookContext): void | Promise<void>;
	/** After credentials verified, before challenge resolution. May mutate the user. */
	afterAuthenticate?(user: AuthUser, ctx: AuthHookContext): void | Promise<void>;
	/** After all challenges pass, before tokens are generated. */
	beforeIssueTokens?(user: AuthUser, ctx: AuthHookContext): void | Promise<void>;
	/** After tokens are generated (before they are returned to the route handler). */
	afterIssueTokens?(user: AuthUser, tokens: AuthTokens, ctx: AuthHookContext): void | Promise<void>;
	/** Login fully succeeded (tokens issued). */
	onLoginSuccess?(user: AuthUser, ctx: AuthHookContext): void | Promise<void>;
	/** Login failed at any point. */
	onLoginFailure?(error: Error, ctx: AuthHookContext): void | Promise<void>;
	/** Before logout cookies are cleared. */
	beforeLogout?(ctx: AuthHookContext): void | Promise<void>;
	/** After logout cookies are cleared. */
	afterLogout?(ctx: AuthHookContext): void | Promise<void>;
}

/**
 * High-level "interrupt the login with a verification step" provider, built on top of the
 * hook + challenge engine. A plugin registers one of these (via
 * `panel.registerAuthChallenge`) to add a verification step without touching any AuthProvider.
 */
export interface AuthChallengeProvider {
	/** Unique challenge type identifier, e.g. 'email-code'. */
	type: string;
	/** Whether this challenge must be satisfied for the given user. */
	isRequired(user: AuthUser, ctx: AuthHookContext): boolean | Promise<boolean>;
	/** Verify the user's response to the challenge. Return true to pass. */
	verify(user: AuthUser, payload: unknown, ctx: AuthHookContext): boolean | Promise<boolean>;
	/** Optional non-secret data sent to the client with the challenge. Never secrets. */
	getChallengeData?(user: AuthUser, ctx: AuthHookContext): unknown | Promise<unknown>;
}

/**
 * Discriminated result of a login attempt or a challenge verification.
 * `authenticated` → tokens issued (cookies set by the route handler).
 * `challenge` → one or more challenges remain; no cookies set, client must continue.
 */
export type LoginResult =
	| { status: 'authenticated'; user: AuthUser; tokens: AuthTokens }
	| { status: 'challenge'; challenge: { type: string; challengeToken: string; data?: unknown } };

/**
 * Configuration for an authentication provider
 */
export interface AuthProviderConfig {
	/** Unique provider identifier */
	name: string;
	/** Display label for login button */
	label?: string;
	/** Icon name (Lucide) for login button */
	icon?: string;
	/** Button color/style */
	buttonStyle?: {
		backgroundColor?: string;
		textColor?: string;
		borderColor?: string;
	};
	/** Auto-create users on first login */
	autoCreateUser?: boolean;
}

/**
 * Button configuration for frontend display
 */
export interface AuthButtonConfig {
	/** Provider name */
	name: string;
	/** Display label */
	label: string;
	/** Icon name */
	icon?: string;
	/** Provider type */
	type: 'credentials' | 'oauth';
	/** Button styling */
	buttonStyle?: {
		backgroundColor?: string;
		textColor?: string;
		borderColor?: string;
	};
	/** Required fields for credentials type */
	fields?: string[];
}

/**
 * JWT configuration
 */
export interface JWTConfig {
	/** Secret key for signing tokens */
	secret: string;
	/** Access token expiration (e.g., '15m', '1h') */
	accessTokenExpiry?: string;
	/** Refresh token expiration (e.g., '7d') */
	refreshTokenExpiry?: string;
	/** Cookie options */
	cookie?: {
		httpOnly?: boolean;
		secure?: boolean;
		sameSite?: 'strict' | 'lax' | 'none';
		domain?: string;
	};
}
