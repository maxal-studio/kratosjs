import jwt from 'jsonwebtoken';
import { AuthUser, JWTConfig } from './types';
import { normalizeRoleId } from './normalizeRole';

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: AuthUser, config: JWTConfig): string {
	const payload = {
		id: user.id,
		email: user.email,
		name: user.name,
		// `role` may be a relation reference/entity (e.g. permissions plugin); store its id.
		role: normalizeRoleId(user.role),
		type: 'access-token',
	};

	const expiresIn = config.accessTokenExpiry || '15m';

	return jwt.sign(payload, config.secret, {
		expiresIn: expiresIn as any,
	});
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user: AuthUser, config: JWTConfig): string {
	const payload = {
		id: user.id,
		type: 'refresh-token',
	};

	const expiresIn = config.refreshTokenExpiry || '7d';

	return jwt.sign(payload, config.secret, {
		expiresIn: expiresIn as any,
	});
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string, secret: string): AuthUser | null {
	try {
		const decoded = jwt.verify(token, secret) as any;

		if (decoded.type !== 'access-token') {
			return null;
		}

		return {
			id: decoded.id,
			email: decoded.email,
			name: decoded.name,
			role: decoded.role,
		};
	} catch (error) {
		return null;
	}
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string, secret: string): { userId: string } | null {
	try {
		const decoded = jwt.verify(token, secret) as any;

		if (decoded.type !== 'refresh-token') {
			return null;
		}

		return {
			userId: decoded.id,
		};
	} catch (error) {
		return null;
	}
}

/**
 * Payload carried by a short-lived challenge ("half-authenticated continuation") token.
 * Issued after credentials are verified but before any auth cookie is set, while one or
 * more challenges (e.g. a one-time code) are still pending. It is returned in the response body so the
 * client can echo it back to `/auth/challenge` — it is NOT a session credential.
 */
export interface ChallengePayload {
	/** Authenticated user id (challenges still pending). */
	userId: string;
	/** Provider name that authenticated the credentials. */
	provider: string;
	/** Ordered list of challenge types still to satisfy; index 0 is the active one. */
	pending: string[];
}

/**
 * Generate a short-lived (5 min) challenge continuation token.
 */
export function generateChallengeToken(payload: ChallengePayload, config: JWTConfig): string {
	return jwt.sign({ ...payload, type: 'challenge' }, config.secret, { expiresIn: '5m' });
}

/**
 * Verify and decode a challenge token. Returns null if invalid, expired, or not a
 * challenge token — guaranteeing it can never be mistaken for an access token.
 */
export function verifyChallengeToken(token: string, secret: string): ChallengePayload | null {
	try {
		const decoded = jwt.verify(token, secret) as any;

		if (decoded.type !== 'challenge') {
			return null;
		}

		return {
			userId: decoded.userId,
			provider: decoded.provider,
			pending: decoded.pending ?? [],
		};
	} catch (error) {
		return null;
	}
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiration(expiryString: string): number {
	// Parse strings like '15m', '1h', '7d'
	const match = expiryString.match(/^(\d+)([smhd])$/);
	if (!match) {
		return 900; // Default 15 minutes
	}

	const value = parseInt(match[1], 10);
	const unit = match[2];

	const multipliers: Record<string, number> = {
		s: 1,
		m: 60,
		h: 3600,
		d: 86400,
	};

	return value * (multipliers[unit] || 60);
}
