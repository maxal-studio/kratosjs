import { describe, expect, it } from 'vitest';
import { AuthManager } from '../src';
import type { AuthUser, AuthHookContext, AuthChallengeProvider } from '../src';

// These tests pin the login pipeline: the hook lifecycle and the challenge protocol.
// They exercise the provider-agnostic layer in AuthManager directly (no Express).

const jwtConfig = { secret: 'test-secret', accessTokenExpiry: '15m', refreshTokenExpiry: '7d' };

function makeManager(): AuthManager {
	return new AuthManager(jwtConfig);
}

/** Minimal AuthProvider stub: only getName/authenticate are exercised by the pipeline. */
function fakeProvider(name: string, user: AuthUser | null) {
	return {
		getName: () => name,
		authenticate: async () => user,
	} as any;
}

function ctxFor(provider: string): AuthHookContext {
	return { provider, req: {} as any, getEm: () => undefined };
}

const alice: AuthUser = { id: '1', email: 'alice@example.com', name: 'Alice' };

describe('AuthManager login pipeline', () => {
	it('issues tokens immediately when no challenge is required', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));

		const result = await mgr.attemptLogin('email', { email: 'a', password: 'b' }, ctxFor('email'));

		expect(result.status).toBe('authenticated');
		if (result.status === 'authenticated') {
			expect(result.user.id).toBe('1');
			expect(result.tokens.accessToken).toBeTruthy();
			expect(result.tokens.refreshToken).toBeTruthy();
		}
	});

	it('pauses with a challenge (no tokens) when a challenge isRequired', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));
		mgr.registerChallenge({
			type: '2fa-totp',
			isRequired: () => true,
			verify: () => true,
			getChallengeData: () => ({ hint: 'authenticator' }),
		} satisfies AuthChallengeProvider);

		const result = await mgr.attemptLogin('email', { email: 'a', password: 'b' }, ctxFor('email'));

		expect(result.status).toBe('challenge');
		if (result.status === 'challenge') {
			expect(result.challenge.type).toBe('2fa-totp');
			expect(result.challenge.challengeToken).toBeTruthy();
			expect(result.challenge.data).toEqual({ hint: 'authenticator' });
			// no `tokens` field exists on the challenge branch
			expect((result as any).tokens).toBeUndefined();
		}
	});

	it('verifyChallenge with the correct payload issues tokens', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));
		mgr.registerChallenge({
			type: '2fa-totp',
			isRequired: () => true,
			verify: (_user, payload: any) => payload?.code === '123456',
		});

		const login = await mgr.attemptLogin('email', {}, ctxFor('email'));
		if (login.status !== 'challenge') throw new Error('expected challenge');

		const getUserById = async () => alice;
		const result = await mgr.verifyChallenge(
			login.challenge.challengeToken,
			'2fa-totp',
			{ code: '123456' },
			ctxFor('email'),
			getUserById,
		);

		expect(result.status).toBe('authenticated');
		if (result.status === 'authenticated') {
			expect(result.tokens.accessToken).toBeTruthy();
		}
	});

	it('verifyChallenge throws on a wrong payload', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));
		mgr.registerChallenge({
			type: '2fa-totp',
			isRequired: () => true,
			verify: (_user, payload: any) => payload?.code === '123456',
		});

		const login = await mgr.attemptLogin('email', {}, ctxFor('email'));
		if (login.status !== 'challenge') throw new Error('expected challenge');

		await expect(
			mgr.verifyChallenge(
				login.challenge.challengeToken,
				'2fa-totp',
				{ code: '000000' },
				ctxFor('email'),
				async () => alice,
			),
		).rejects.toThrow(/Verification failed/);
	});

	it('chains multiple challenges before issuing tokens', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));
		mgr.registerChallenge({ type: 'a', isRequired: () => true, verify: () => true });
		mgr.registerChallenge({ type: 'b', isRequired: () => true, verify: () => true });

		const login = await mgr.attemptLogin('email', {}, ctxFor('email'));
		if (login.status !== 'challenge') throw new Error('expected challenge');
		expect(login.challenge.type).toBe('a');

		const step2 = await mgr.verifyChallenge(
			login.challenge.challengeToken,
			'a',
			{},
			ctxFor('email'),
			async () => alice,
		);
		expect(step2.status).toBe('challenge');
		if (step2.status !== 'challenge') throw new Error('expected second challenge');
		expect(step2.challenge.type).toBe('b');

		const done = await mgr.verifyChallenge(
			step2.challenge.challengeToken,
			'b',
			{},
			ctxFor('email'),
			async () => alice,
		);
		expect(done.status).toBe('authenticated');
	});

	it('runs lifecycle hooks in registration order', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));

		const order: string[] = [];
		mgr.registerHook({
			beforeAuthenticate: () => void order.push('before:1'),
			afterAuthenticate: () => void order.push('afterAuth:1'),
			beforeIssueTokens: () => void order.push('beforeIssue:1'),
			afterIssueTokens: () => void order.push('afterIssue:1'),
			onLoginSuccess: () => void order.push('success:1'),
		});
		mgr.registerHook({
			beforeAuthenticate: () => void order.push('before:2'),
			onLoginSuccess: () => void order.push('success:2'),
		});

		await mgr.attemptLogin('email', {}, ctxFor('email'));

		expect(order).toEqual([
			'before:1',
			'before:2',
			'afterAuth:1',
			'beforeIssue:1',
			'afterIssue:1',
			'success:1',
			'success:2',
		]);
	});

	it('rejects a login when beforeAuthenticate throws', async () => {
		const mgr = makeManager();
		mgr.registerProvider(fakeProvider('email', alice));
		mgr.registerHook({
			beforeAuthenticate: () => {
				throw new Error('rate limited');
			},
		});

		await expect(mgr.attemptLogin('email', {}, ctxFor('email'))).rejects.toThrow(/rate limited/);
	});
});
