import type { ComponentType } from 'react';

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

/**
 * A pending login challenge returned by the server (e.g. 2FA). The `challengeToken` is an
 * opaque continuation token the client must echo back to `/auth/challenge` — never decode
 * it for trust decisions. `data` carries non-secret hints for the challenge UI.
 */
export interface PendingChallenge {
	type: string;
	challengeToken: string;
	data?: unknown;
}

/**
 * Discriminated result of a login attempt or a challenge verification, mirroring the
 * backend `LoginResult`. `authenticated` → the session cookie is set; `challenge` → one or
 * more steps remain and no session cookie was set.
 */
export type LoginResult =
	| { status: 'authenticated'; user: AuthUser; tokens: { expiresIn: number } }
	| { status: 'challenge'; challenge: PendingChallenge };

/**
 * Props passed to a challenge UI component registered under `authChallenges`.
 */
export interface AuthChallengeProps {
	/** Non-secret data sent by the server with the challenge. */
	data?: unknown;
	/** Submit the user's response; resolves when verified (or rejects on error). */
	onSubmit: (payload: unknown) => Promise<void>;
	/** Abandon the challenge and return to the login form. */
	onCancel: () => void;
	/** Verification error to display, if any. */
	error?: string | null;
	/** Whether a verification request is in flight. */
	submitting?: boolean;
}

/** A React component that renders a challenge step. */
export type AuthChallengeComponent = ComponentType<AuthChallengeProps>;
