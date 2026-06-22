import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, LoginCredentials, PendingChallenge } from './types';
import { AuthApiClient } from './authApiClient';
import { useAuth } from './AuthContext';
import { useAuthChallengeRegistry } from '../contexts/AuthChallengeRegistryContext';
import { Icon } from '../components/utils/Icon';
import { cn } from '../utils/classNames';
import { Button, IconButton, Input, Label, ErrorAlert, Spinner } from '../components/ui';
import { PanelBrandMark } from '../components/layout/PanelBrandMark';
import { Moon, Sun, ArrowLeft } from 'lucide-react';

interface PanelBranding {
	title?: string;
	icon?: string;
	favicon?: string;
}

interface LoginPageProps {
	apiBaseUrl: string;
	onSuccess?: () => void;
}

function useDarkMode() {
	const [darkMode, setDarkMode] = useState(() => {
		const stored = localStorage.getItem('darkMode');
		if (stored !== null) {
			return stored === 'true';
		}
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	useEffect(() => {
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('darkMode', String(darkMode));
	}, [darkMode]);

	return [darkMode, setDarkMode] as const;
}

function getSubtitle(providers: AuthProvider[], selectedProvider: AuthProvider | null): string {
	if (providers.length > 1 && !selectedProvider) {
		return 'Choose how you would like to sign in';
	}

	const provider = selectedProvider ?? providers[0];
	if (provider?.type === 'oauth') {
		return 'Continue to access your account';
	}

	return 'Enter your credentials to continue';
}

interface ProviderButtonProps {
	provider: AuthProvider;
	onSelect: (provider: AuthProvider) => void;
}

function ProviderButton({ provider, onSelect }: ProviderButtonProps) {
	const hasCustomStyle = Boolean(provider.buttonStyle?.backgroundColor);

	return (
		<Button
			type="button"
			variant={hasCustomStyle ? 'primary' : 'secondary'}
			className={cn('w-full h-11', hasCustomStyle && 'border-transparent')}
			style={
				hasCustomStyle
					? {
							backgroundColor: provider.buttonStyle!.backgroundColor,
							color: provider.buttonStyle!.textColor || '#ffffff',
							borderColor: provider.buttonStyle!.borderColor || provider.buttonStyle!.backgroundColor,
						}
					: undefined
			}
			icon={
				provider.icon ? (
					<Icon name={provider.icon as any} className={cn('h-4 w-4', !hasCustomStyle && 'text-fg')} />
				) : undefined
			}
			onClick={() => onSelect(provider)}>
			{provider.label}
		</Button>
	);
}

/**
 * Renders the active login challenge (e.g. 2FA) using the plugin-registered component for
 * its `type`. Owns the per-attempt submitting/error state and wires the challenge UI to
 * `verifyChallenge` / `cancelChallenge` from the auth context.
 */
function ChallengeStep({ challenge }: { challenge: PendingChallenge }) {
	const { verifyChallenge, cancelChallenge } = useAuth();
	const registry = useAuthChallengeRegistry();
	const ChallengeComponent = registry[challenge.type];
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (!ChallengeComponent) {
		return (
			<div className="space-y-4">
				<ErrorAlert message={`No UI is registered for challenge type "${challenge.type}".`} />
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="-ml-2 h-8 px-2 text-fg-secondary"
					icon={<ArrowLeft className="h-4 w-4" />}
					onClick={cancelChallenge}>
					Back to sign in
				</Button>
			</div>
		);
	}

	const handleSubmit = async (payload: unknown) => {
		setSubmitting(true);
		setError(null);
		try {
			await verifyChallenge(payload);
		} catch (err: any) {
			setError(err.message || 'Verification failed');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<ChallengeComponent
			data={challenge.data}
			onSubmit={handleSubmit}
			onCancel={cancelChallenge}
			error={error}
			submitting={submitting}
		/>
	);
}

/**
 * LoginPage - Displays authentication providers and handles login
 */
export function LoginPage({ apiBaseUrl, onSuccess }: LoginPageProps) {
	const { login, pendingChallenge } = useAuth();
	const [providers, setProviders] = useState<AuthProvider[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedProvider, setSelectedProvider] = useState<AuthProvider | null>(null);
	const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
	const [submitting, setSubmitting] = useState(false);
	const [panelBranding, setPanelBranding] = useState<PanelBranding>({});
	const [darkMode, setDarkMode] = useDarkMode();

	const apiClient = useMemo(() => new AuthApiClient(apiBaseUrl), [apiBaseUrl]);

	const showProviderPicker = providers.length > 1 && !selectedProvider;
	const activeProvider = selectedProvider ?? (providers.length === 1 ? providers[0] : null);
	const showCredentialsForm = activeProvider?.type === 'credentials';
	const showOAuthPrompt = activeProvider?.type === 'oauth' && !showProviderPicker;
	const showBackLink = providers.length > 1 && selectedProvider?.type === 'credentials';

	const subtitle = useMemo(() => getSubtitle(providers, selectedProvider), [providers, selectedProvider]);

	// Load panel branding for the login screen (meta endpoint allows unauthenticated access)
	useEffect(() => {
		const fetchBranding = async () => {
			try {
				const response = await fetch(`${apiBaseUrl}/meta`);
				if (!response.ok) return;
				const meta = await response.json();
				setPanelBranding({
					title: meta.title,
					icon: meta.icon,
					favicon: meta.favicon,
				});
			} catch {
				// Branding is optional — fall back to defaults
			}
		};

		fetchBranding();
	}, [apiBaseUrl]);

	// Fetch available providers
	useEffect(() => {
		const fetchProviders = async () => {
			try {
				const providerList = await apiClient.getProviders();
				setProviders(providerList);
				if (providerList.length === 1) {
					setSelectedProvider(providerList[0]);
				}
			} catch (err: any) {
				setError(err.message || 'Failed to load authentication providers');
			} finally {
				setLoading(false);
			}
		};

		fetchProviders();
	}, [apiClient]);

	const handleProviderSelect = (provider: AuthProvider) => {
		if (provider.type === 'oauth') {
			const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
			const authUrl = `${apiBaseUrl}/auth/oauth/${provider.name}?redirect_uri=${redirectUri}`;
			window.location.href = authUrl;
			return;
		}

		setSelectedProvider(provider);
		setError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeProvider) return;

		setSubmitting(true);
		setError(null);

		try {
			await login(activeProvider.name, credentials);
			onSuccess?.();
		} catch (err: any) {
			setError(err.message || 'Login failed');
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-base px-6">
				<div className="text-center">
					<Spinner size="lg" className="mx-auto text-accent" />
					<p className="mt-4 text-sm text-fg-secondary">Preparing sign in…</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-base px-6 py-12">
			<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
				<div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent-soft/50 blur-3xl" />
				<div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-accent-soft/25 blur-3xl" />
			</div>

			<IconButton
				variant="secondary"
				size="sm"
				aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				onClick={() => setDarkMode(!darkMode)}
				className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
				{darkMode ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4" />}
			</IconButton>

			<div className="relative w-full max-w-[420px]">
				<header className="mb-8 text-center">
					<div className="mx-auto mb-5 flex justify-center">
						<PanelBrandMark icon={panelBranding.icon} favicon={panelBranding.favicon} size="lg" />
					</div>
					<h1 className="text-2xl font-semibold tracking-tight text-fg">
						{pendingChallenge
							? 'Verify your identity'
							: panelBranding.title
								? `Sign in to ${panelBranding.title}`
								: 'Welcome back'}
					</h1>
					<p className="mt-2 text-sm text-fg-secondary">
						{pendingChallenge ? 'Complete the additional step to finish signing in' : subtitle}
					</p>
				</header>

				<div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
					{pendingChallenge && <ChallengeStep challenge={pendingChallenge} />}

					{!pendingChallenge && error && (
						<ErrorAlert message={error} onDismiss={() => setError(null)} className="mb-6" />
					)}

					{!pendingChallenge && showProviderPicker && (
						<div className="space-y-3">
							{providers.map(provider => (
								<ProviderButton
									key={provider.name}
									provider={provider}
									onSelect={handleProviderSelect}
								/>
							))}
						</div>
					)}

					{!pendingChallenge && showOAuthPrompt && activeProvider && (
						<div className="space-y-4">
							<ProviderButton provider={activeProvider} onSelect={handleProviderSelect} />
							<p className="text-center text-xs text-fg-muted">
								You will be redirected to {activeProvider.label} to complete sign in.
							</p>
						</div>
					)}

					{!pendingChallenge && showCredentialsForm && (
						<form onSubmit={handleSubmit} className="space-y-5">
							{showBackLink && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-ml-2 h-8 px-2 text-fg-secondary"
									icon={<ArrowLeft className="h-4 w-4" />}
									onClick={() => {
										setSelectedProvider(null);
										setError(null);
										setCredentials({ email: '', password: '' });
									}}>
									Back to sign-in options
								</Button>
							)}

							<div className="space-y-2">
								<Label htmlFor="email" required>
									Email
								</Label>
								<Input
									id="email"
									type="email"
									required
									value={credentials.email}
									onChange={e => setCredentials({ ...credentials, email: e.target.value })}
									placeholder="you@company.com"
									autoComplete="email"
									autoFocus
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password" required>
									Password
								</Label>
								<Input
									id="password"
									type="password"
									required
									value={credentials.password}
									onChange={e => setCredentials({ ...credentials, password: e.target.value })}
									placeholder="Enter your password"
									autoComplete="current-password"
								/>
							</div>

							<Button type="submit" loading={submitting} className="w-full h-11">
								Sign in
							</Button>
						</form>
					)}

					{!pendingChallenge && !showProviderPicker && !showOAuthPrompt && !showCredentialsForm && (
						<p className="text-center text-sm text-fg-secondary">
							No authentication providers are configured.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
