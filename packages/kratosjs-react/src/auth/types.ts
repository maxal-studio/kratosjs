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
	_auth?: Record<string, any>;
	/** Additional custom fields */
	[key: string]: any;
}

/**
 * Authentication provider configuration
 */
export interface AuthProvider {
	/** Provider name */
	name: string;
	/** Display label */
	label: string;
	/** Icon name (Lucide) */
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
 * Login credentials
 */
export interface LoginCredentials {
	email: string;
	password: string;
}
