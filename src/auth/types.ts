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
	/** Resolve a stored media value to a URL. */
	resolveMediaUrl: (value: any) => Promise<string | undefined>;
	/** Verify a plaintext password against a stored hash. */
	verifyPassword: (plain: string, hash: string | undefined | null) => Promise<boolean>;
}

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
