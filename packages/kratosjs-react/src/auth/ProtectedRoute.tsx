import React from 'react';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
	children: React.ReactNode;
	apiBaseUrl: string;
	fallback?: React.ReactNode;
}

/**
 * ProtectedRoute - Wraps content that requires authentication
 * Shows LoginPage if not authenticated, otherwise shows children
 */
export function ProtectedRoute({ children, apiBaseUrl, fallback }: ProtectedRouteProps) {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div className="min-h-screen bg-base flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
					<p className="mt-4 text-fg-secondary">Loading...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		if (fallback) {
			return <>{fallback}</>;
		}
		return <LoginPage apiBaseUrl={apiBaseUrl} />;
	}

	return <>{children}</>;
}
