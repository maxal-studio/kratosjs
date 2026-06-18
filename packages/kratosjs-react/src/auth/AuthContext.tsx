import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthUser, LoginCredentials, AuthTokens } from './types';
import { AuthApiClient } from './authApiClient';
import { tokenStorage } from './tokenStorage';
import { getTokenExpirationTime } from './jwtUtils';

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	login: (provider: string, credentials: LoginCredentials) => Promise<void>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
	children: React.ReactNode;
	apiBaseUrl: string;
}

/**
 * AuthProvider - Provides authentication context to the app
 */
export function AuthProvider({ children, apiBaseUrl }: AuthProviderProps) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const apiClient = useRef(new AuthApiClient(apiBaseUrl));
	const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

	/**
	 * Refresh access token before it expires
	 */
	const scheduleTokenRefresh = useCallback((expiresIn: number) => {
		// Clear existing timer
		if (refreshTimerRef.current) {
			clearTimeout(refreshTimerRef.current);
		}

		// Schedule refresh 1 minute before expiry
		const refreshTime = Math.max((expiresIn - 60) * 1000, 60000); // At least 1 minute

		refreshTimerRef.current = setTimeout(async () => {
			try {
				const tokens = await apiClient.current.refreshToken();
				if (tokens) {
					// Schedule next refresh
					scheduleTokenRefresh(tokens.expiresIn);
				} else {
					// Refresh failed - user needs to login again
					setUser(null);
				}
			} catch (error) {
				console.error('Token refresh failed:', error);
				setUser(null);
			}
		}, refreshTime);
	}, []);

	/**
	 * Fetch current user from API
	 * Attempts to refresh token if 401 error occurs
	 */
	const fetchUser = useCallback(async () => {
		try {
			const currentUser = await apiClient.current.getCurrentUser();
			setUser(currentUser);
			return currentUser;
		} catch (error: any) {
			// If 401, try to refresh token and retry
			if (error?.status === 401 || error?.message?.includes('401')) {
				try {
					const tokens = await apiClient.current.refreshToken();
					if (tokens) {
						// Retry getting user with new token
						const currentUser = await apiClient.current.getCurrentUser();
						setUser(currentUser);
						if (currentUser) {
							// Schedule next refresh based on new token
							const token = tokenStorage.getAccessToken();
							if (token) {
								const expiresIn = getTokenExpirationTime(token);
								if (expiresIn) {
									scheduleTokenRefresh(expiresIn);
								}
							}
						}
						return currentUser;
					}
				} catch (refreshError) {
					console.error('Token refresh failed:', refreshError);
				}
			}
			console.error('Failed to fetch user:', error);
			setUser(null);
			return null;
		}
	}, [scheduleTokenRefresh]);

	/**
	 * Login with provider and credentials
	 */
	const login = useCallback(
		async (provider: string, credentials: LoginCredentials) => {
			try {
				const result = await apiClient.current.login(provider, credentials);
				setUser(result.user);

				// Schedule token refresh
				if (result.tokens) {
					scheduleTokenRefresh(result.tokens.expiresIn);
				}
			} catch (error: any) {
				throw new Error(error.message || 'Login failed');
			}
		},
		[scheduleTokenRefresh],
	);

	/**
	 * Logout - clear user and tokens
	 */
	const logout = useCallback(async () => {
		try {
			await apiClient.current.logout();
		} catch (error) {
			// Ignore errors
		} finally {
			setUser(null);
			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
				refreshTimerRef.current = null;
			}
		}
	}, []);

	/**
	 * Refresh user data
	 */
	const refreshUser = useCallback(async () => {
		const user = await fetchUser();
		if (user) {
			// Update token refresh schedule if we have a token
			const token = tokenStorage.getAccessToken();
			if (token) {
				const expiresIn = getTokenExpirationTime(token);
				if (expiresIn) {
					scheduleTokenRefresh(expiresIn);
				}
			}
		}
	}, [fetchUser, scheduleTokenRefresh]);

	// Initialize - fetch user on mount if token exists
	useEffect(() => {
		const init = async () => {
			setLoading(true);
			const token = tokenStorage.getAccessToken();
			if (token) {
				const currentUser = await fetchUser();
				if (currentUser) {
					// Get actual token expiry from JWT
					const expiresIn = getTokenExpirationTime(token);
					if (expiresIn) {
						scheduleTokenRefresh(expiresIn);
					} else {
						// Fallback: try to refresh token to get new expiry
						const tokens = await apiClient.current.refreshToken();
						if (tokens) {
							const newToken = tokenStorage.getAccessToken();
							if (newToken) {
								const newExpiresIn = getTokenExpirationTime(newToken);
								if (newExpiresIn) {
									scheduleTokenRefresh(newExpiresIn);
								}
							}
						}
					}
				}
			}
			setLoading(false);
		};

		init();

		// Cleanup on unmount
		return () => {
			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
			}
		};
	}, [fetchUser, scheduleTokenRefresh]);

	const value: AuthContextValue = {
		user,
		loading,
		login,
		logout,
		refreshUser,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
