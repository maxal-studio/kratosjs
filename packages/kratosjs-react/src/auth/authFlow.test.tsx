import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { AuthChallengeRegistryProvider } from '../contexts/AuthChallengeRegistryContext';
import { resolveRegistries } from '../app';
import { definePluginClient } from '../plugin';
import type { AuthChallengeProps } from './types';

// Minimal fetch Response stand-in for the auth client.
function resp(data: any, ok = true, status = 200) {
	return { ok, status, json: async () => data } as Response;
}

const challengeResp = {
	status: 'challenge',
	challenge: { type: '2fa-totp', challengeToken: 'ct-1', data: { hint: 'authenticator' } },
};
const authResp = {
	status: 'authenticated',
	user: { id: '1', email: 'alice@example.com' },
	tokens: { expiresIn: 900 },
};

/** Route fetch by URL; /auth/me + /auth/refresh resolve to "not logged in". */
function makeFetch(routes: { login: () => Response; challenge?: () => Response }) {
	return vi.fn(async (url: string | URL) => {
		const u = String(url);
		if (u.includes('/auth/login')) return routes.login();
		if (u.includes('/auth/challenge')) return (routes.challenge ?? (() => resp(authResp)))();
		if (u.includes('/auth/me')) return resp({}, false, 401);
		if (u.includes('/auth/refresh')) return resp(null, false, 401);
		if (u.includes('/auth/providers'))
			return resp({ providers: [{ name: 'email', label: 'Email', type: 'credentials' }] });
		if (u.includes('/meta')) return resp({ title: 'Test Panel' });
		return resp({}, false, 404);
	});
}

beforeEach(() => {
	if (!window.matchMedia) {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		})) as any;
	}
});

function Consumer() {
	const { user, pendingChallenge, login, verifyChallenge } = useAuth();
	return (
		<div>
			<div data-testid="user">{user ? user.email : 'none'}</div>
			<div data-testid="challenge">{pendingChallenge ? pendingChallenge.type : 'none'}</div>
			<button onClick={() => login('email', { email: 'a@b.c', password: 'x' })}>do-login</button>
			<button onClick={() => verifyChallenge({ code: '123456' })}>do-verify</button>
		</div>
	);
}

describe('AuthContext multi-step login', () => {
	it('a challenge login sets pendingChallenge and leaves the user null', async () => {
		vi.stubGlobal('fetch', makeFetch({ login: () => resp(challengeResp) }));

		render(
			<AuthProvider apiBaseUrl="/api">
				<Consumer />
			</AuthProvider>,
		);
		await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));

		await userEvent.click(screen.getByText('do-login'));

		await waitFor(() => expect(screen.getByTestId('challenge').textContent).toBe('2fa-totp'));
		expect(screen.getByTestId('user').textContent).toBe('none');
	});

	it('verifying the challenge sets the user and clears pendingChallenge', async () => {
		vi.stubGlobal('fetch', makeFetch({ login: () => resp(challengeResp), challenge: () => resp(authResp) }));

		render(
			<AuthProvider apiBaseUrl="/api">
				<Consumer />
			</AuthProvider>,
		);
		await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));

		await userEvent.click(screen.getByText('do-login'));
		await waitFor(() => expect(screen.getByTestId('challenge').textContent).toBe('2fa-totp'));

		await userEvent.click(screen.getByText('do-verify'));
		await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice@example.com'));
		expect(screen.getByTestId('challenge').textContent).toBe('none');
	});
});

describe('LoginPage challenge rendering', () => {
	it('renders the registered challenge component for the pending type', async () => {
		vi.stubGlobal('fetch', makeFetch({ login: () => resp(challengeResp) }));

		const TotpUI = ({ onSubmit, submitting }: AuthChallengeProps) => (
			<div>
				<div>Enter your authenticator code</div>
				<button onClick={() => onSubmit({ code: '123456' })} disabled={submitting}>
					submit-code
				</button>
			</div>
		);

		render(
			<AuthProvider apiBaseUrl="/api">
				<AuthChallengeRegistryProvider customAuthChallenges={{ '2fa-totp': TotpUI }}>
					<LoginPage apiBaseUrl="/api" />
				</AuthChallengeRegistryProvider>
			</AuthProvider>,
		);

		const email = await screen.findByPlaceholderText('you@company.com');
		await userEvent.type(email, 'a@b.c');
		await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'secret');
		await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

		expect(await screen.findByText('Enter your authenticator code')).toBeTruthy();
	});

	it('shows a fallback when no component is registered for the challenge type', async () => {
		vi.stubGlobal('fetch', makeFetch({ login: () => resp(challengeResp) }));

		render(
			<AuthProvider apiBaseUrl="/api">
				<AuthChallengeRegistryProvider customAuthChallenges={{}}>
					<LoginPage apiBaseUrl="/api" />
				</AuthChallengeRegistryProvider>
			</AuthProvider>,
		);

		const email = await screen.findByPlaceholderText('you@company.com');
		await userEvent.type(email, 'a@b.c');
		await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'secret');
		await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

		expect(await screen.findByText(/No UI is registered for challenge type/)).toBeTruthy();
	});
});

describe('resolveRegistries authChallenges', () => {
	it('merges plugin authChallenges and lets app entries win', () => {
		const PluginUI = () => null;
		const AppUI = () => null;
		const plugin = definePluginClient({ name: '2fa', authChallenges: { '2fa-totp': PluginUI } });

		const registries = resolveRegistries({
			plugins: [plugin],
			authChallenges: { 'email-code': AppUI },
		});

		expect(registries.authChallenges['2fa-totp']).toBe(PluginUI);
		expect(registries.authChallenges['email-code']).toBe(AppUI);
	});
});
