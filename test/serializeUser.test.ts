import { describe, expect, it } from 'vitest';
import { defaultSerializeUser } from '../src';
import type { SerializeUserContext } from '../src';

// The default serializer is the single source of truth for the client-facing user shape.
// These tests pin two contracts: the standard field mapping, and that `role` — a plugin
// concept, not a base one — is never emitted by the default (apps add it via extendUser).

const ctx: SerializeUserContext = {
	fields: {
		email: 'email',
		password: 'password',
		firstname: 'firstname',
		lastname: 'lastname',
		image: 'profileMediaImage',
		role: 'role',
	},
	resolveMediaUrl: async (v: any) => (v ? `https://cdn/${v}` : undefined),
	getEm: () => undefined,
};

describe('defaultSerializeUser', () => {
	it('maps the standard fields and resolves the avatar', async () => {
		const user = await defaultSerializeUser(
			{ id: 5, email: 'a@b.com', firstname: 'Ada', lastname: 'Lovelace', profileMediaImage: 'pic.png' },
			ctx,
		);

		expect(user).toMatchObject({
			id: '5',
			email: 'a@b.com',
			name: 'Ada Lovelace',
			avatarUrl: 'https://cdn/pic.png',
		});
	});

	it('never emits `role` — even when the entity has one (role is plugin-owned via extendUser)', async () => {
		const base = await defaultSerializeUser({ id: 1, email: 'a@b.com' }, ctx);
		expect('role' in base).toBe(false);

		const withRoleColumn = await defaultSerializeUser({ id: 1, email: 'a@b.com', role: { id: 7 } }, ctx);
		expect('role' in withRoleColumn).toBe(false);
	});
});
