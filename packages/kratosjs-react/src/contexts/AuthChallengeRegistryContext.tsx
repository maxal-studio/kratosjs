import React from 'react';
import type { AuthChallengeComponent } from '../auth/types';
import { createRegistryContext } from './createRegistryContext';

export type AuthChallengeRegistry = Record<string, AuthChallengeComponent>;

// No built-in challenge UIs: challenge components are entirely plugin-provided
// (e.g. the 2FA plugin registers a '2fa-totp' component).
const registry = createRegistryContext<AuthChallengeComponent>('AuthChallengeRegistry', {});

export const AuthChallengeRegistryContext = registry.Context;
export const useAuthChallengeRegistry = registry.useRegistry;

export interface AuthChallengeRegistryProviderProps {
	customAuthChallenges?: AuthChallengeRegistry;
	children: React.ReactNode;
}

/**
 * Provider for challenge UI components keyed by challenge `type`. Lives above the auth gate
 * so the LoginPage (rendered when there is no user) can look up the component for a pending
 * challenge.
 */
export function AuthChallengeRegistryProvider({
	customAuthChallenges = {},
	children,
}: AuthChallengeRegistryProviderProps) {
	return <registry.Provider registry={customAuthChallenges}>{children}</registry.Provider>;
}
