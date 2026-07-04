// Types
export type {
	AuthUser,
	AuthTokens,
	AuthProviderConfig,
	AuthButtonConfig,
	JWTConfig,
	UserFieldMap,
	ResolvedUserFieldMap,
	AuthDefaultsContext,
	SerializeUser,
	SerializeUserContext,
	ExtendUser,
	AuthHooks,
	AuthHookContext,
	AuthChallengeProvider,
	LoginResult,
} from './types';

// Base provider
export { AuthProvider } from './AuthProvider';

// Default user serializer (raw entity -> AuthUser)
export { defaultSerializeUser } from './serializeUser';

// Providers
export { EmailAuthProvider } from './providers/EmailAuthProvider';
export type { EmailAuthProviderConfig } from './providers/EmailAuthProvider';

export { GitHubAuthProvider } from './providers/GitHubAuthProvider';
export type { GitHubAuthProviderConfig } from './providers/GitHubAuthProvider';

// Manager
export { AuthManager } from './AuthManager';

// Middleware
export { authMiddleware, optionalAuthMiddleware } from './middleware';

// JWT utilities
export {
	generateAccessToken,
	generateRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
	getTokenExpiration,
	generateChallengeToken,
	verifyChallengeToken,
} from './jwt';
export type { ChallengePayload } from './jwt';

// Role helpers
export { normalizeRoleId } from './normalizeRole';

// Password helpers
export { hashPassword, verifyPassword } from './password';
