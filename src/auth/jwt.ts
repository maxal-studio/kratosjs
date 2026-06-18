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
