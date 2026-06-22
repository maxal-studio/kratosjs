import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthUser, LoginCredentials, PendingChallenge } from './types';
import { AuthApiClient } from './authApiClient';

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	/** A challenge (e.g. 2FA) awaiting the user's response, or null. */
	pendingChallenge: PendingChallenge | null;
	login: (provider: string, credentials: LoginCredentials) => Promise<void>;
	/** Submit a response to the active `pendingChallenge`. */
	verifyChallenge: (payload: unknown) => Promise<void>;
	/** Abandon the active challenge and return to the login form. */
	cancelChallenge: () => void;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
	children: React.ReactNode;
	apiBaseUrl: string;
}

export function AuthProvider({ children, apiBaseUrl }: AuthProviderProps) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
	const apiClient = useRef(new AuthApiClient(apiBaseUrl));
	const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

	const scheduleTokenRefresh = useCallback((expiresIn: number) => {
		if (refreshTimerRef.current) {
			clearTimeout(refreshTimerRef.current);
		}

		// Refresh 1 minute before expiry, minimum 1 minute
		const refreshTime = Math.max((expiresIn - 60) * 1000, 60000);

		refreshTimerRef.current = setTimeout(async () => {
			try {
				const tokens = await apiClient.current.refreshToken();
				if (tokens?.expiresIn) {
					scheduleTokenRefresh(tokens.expiresIn);
				} else {
					setUser(null);
				}
			} catch {
				setUser(null);
			}
		}, refreshTime);
	}, []);

	/**
	 * Fetch the current user from /auth/me.
	 * On 401, attempts a silent token refresh via the cookie before giving up.
	 * Seeds the proactive refresh timer when a refresh response includes expiresIn.
	 */
	const fetchUser = useCallback(async () => {
		try {
			const currentUser = await apiClient.current.getCurrentUser();
			setUser(currentUser);
			return currentUser;
		} catch (error: any) {
			if (error?.status === 401) {
				try {
					const tokens = await apiClient.current.refreshToken();
					if (tokens) {
						if (tokens.expiresIn) scheduleTokenRefresh(tokens.expiresIn);
						const currentUser = await apiClient.current.getCurrentUser();
						setUser(currentUser);
						return currentUser;
					}
				} catch {
					// refresh failed — fall through to null
				}
			}
			setUser(null);
			return null;
		}
	}, [scheduleTokenRefresh]);

	/** Apply an `authenticated` result: set the user and seed the refresh timer. */
	const applyAuthenticated = useCallback(
		(authUser: AuthUser, expiresIn?: number) => {
			setPendingChallenge(null);
			setUser(authUser);
			if (expiresIn) {
				scheduleTokenRefresh(expiresIn);
			}
		},
		[scheduleTokenRefresh],
	);

	const login = useCallback(
		async (provider: string, credentials: LoginCredentials) => {
			const result = await apiClient.current.login(provider, credentials);
			if (result.status === 'authenticated') {
				applyAuthenticated(result.user, result.tokens?.expiresIn);
			} else {
				// Pause here: a challenge (e.g. 2FA) must be satisfied before tokens are issued.
				setPendingChallenge(result.challenge);
			}
		},
		[applyAuthenticated],
	);

	const verifyChallenge = useCallback(
		async (payload: unknown) => {
			if (!pendingChallenge) {
				throw new Error('No challenge in progress');
			}
			const result = await apiClient.current.verifyChallenge(
				pendingChallenge.challengeToken,
				pendingChallenge.type,
				payload,
			);
			if (result.status === 'authenticated') {
				applyAuthenticated(result.user, result.tokens?.expiresIn);
			} else {
				// Chained step: replace with the next pending challenge.
				setPendingChallenge(result.challenge);
			}
		},
		[pendingChallenge, applyAuthenticated],
	);

	const cancelChallenge = useCallback(() => {
		setPendingChallenge(null);
	}, []);

	const logout = useCallback(async () => {
		try {
			await apiClient.current.logout();
		} catch {
			// ignore
		} finally {
			setUser(null);
			setPendingChallenge(null);
			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
				refreshTimerRef.current = null;
			}
		}
	}, []);

	const refreshUser = useCallback(async () => {
		await fetchUser();
	}, [fetchUser]);

	useEffect(() => {
		const init = async () => {
			setLoading(true);
			await fetchUser();
			setLoading(false);
		};

		init();

		return () => {
			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
			}
		};
	}, [fetchUser]);

	const value: AuthContextValue = {
		user,
		loading,
		pendingChallenge,
		login,
		verifyChallenge,
		cancelChallenge,
		logout,
		refreshUser,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
