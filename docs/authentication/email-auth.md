---
title: Email Auth
---

# Email & Password Authentication

`EmailAuthProvider` is the **default** authentication provider. With a `userEntity`
configured on `panel.auth()`, both the credential check (`validateCredentials`) and the
user lookup (`getUserById`) are provided for you — so the minimal setup is just:

```typescript
import { Panel, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

const panel = Panel.make('admin')
	.orm(/* ... */)
	.resources([UserResource])
	.auth({
		jwt: {
			secret: process.env.JWT_SECRET || 'your-secret-key',
			accessTokenExpiry: '15m',
			refreshTokenExpiry: '7d',
		},
		// Enables the default validateCredentials + getUserById.
		userEntity: User,
		providers: [new EmailAuthProvider()],
	});
```

The default flow looks the user up by `email` (lowercased), verifies the password hash,
and returns the **raw user entity**. A single `serializeUser` then shapes that entity into
the user returned to the client (id, email, name, avatar — plus `role` when the entity has
one). `getUserById` (used by `/auth/me` and token refresh) does the equivalent lookup by
primary key and is shaped by the same `serializeUser`, so every path returns the same fields.

> `providers` is optional too — omit it and a default `EmailAuthProvider` is added
> automatically when `userEntity` is set. It's shown explicitly above so it's easy to
> relabel or add more providers.

## Field names

The defaults assume these properties on the user entity: `email`, `password`, `firstname`,
`lastname`, `profileMediaImage`, `role`. Map any that differ via `userFields`:

```typescript
.auth({
	jwt: { /* ... */ },
	userEntity: User,
	userFields: { image: 'avatar', firstname: 'givenName', lastname: 'familyName' },
});
```

## Customizing the returned user

To expose extra columns or reshape the user returned to the client, use `extendUser` /
`serializeUser`. They apply to **all** providers, so they're documented once in
[Customizing the returned user](/authentication/overview#customizing-the-returned-user).

## Overriding the defaults

Each piece is overridable; pass your own and it takes precedence over the default.

**Custom credential check** — pass `validateCredentials` to the provider. It returns the raw
user entity (or `null`); `serializeUser` handles the shaping, so no field mapping here:

```typescript
providers: [
	new EmailAuthProvider({
		label: 'Sign in with Email',
		validateCredentials: async (email, password) => {
			const user = await panel.getEm().findOne(User, { email: email.toLowerCase() });
			if (!user || !(await verifyPassword(password, user.password))) return null;
			return user; // raw entity; serializeUser shapes it
		},
	}),
],
```

**Custom user lookup** — pass `getUserById` (returns the already-shaped user):

```typescript
.auth({
	jwt: { /* ... */ },
	userEntity: User,
	getUserById: async (id) => {
		const user = await panel.getEm().findOne(User, { id: Number(id) });
		return user ? { id: String(user.id), email: user.email, name: user.firstname } : null;
	},
});
```

**Custom password verifier** — pass `verifyPassword` (defaults to bcrypt):

```typescript
.auth({ jwt: { /* ... */ }, userEntity: User, verifyPassword: async (plain, hash) => myCompare(plain, hash) });
```

**Add more providers** — list them alongside the email provider (see [OAuth Providers](./oauth.md)):

```typescript
providers: [new EmailAuthProvider(), new GitHubAuthProvider({ /* ... */ })],
```

## Password hashing

Core exports `hashPassword` / `verifyPassword` (bcrypt-compatible `$2b$` hashes), so apps
don't need their own bcrypt dependency. Use `hashPassword` when creating/seeding users:

```typescript
import { hashPassword } from '@maxal_studio/kratosjs';

em.create(User, { email, password: await hashPassword(plainPassword) /* ... */ });
```

The default credential check uses `verifyPassword` under the hood; supply a custom
`verifyPassword` to `auth()` if you hash differently.

## Seeding an admin user

```typescript
// src/seedAdminUser.ts
import { hashPassword, type Panel } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

export async function seedAdminUser(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();
	if (await em.findOne(User, { email: 'admin@example.com' })) return;

	em.create(User, {
		firstname: 'Admin',
		email: 'admin@example.com',
		password: await hashPassword('password'),
		active: true,
		createdAt: new Date(),
	});
	await em.flush();
}
```

Use `panel.getOrm().em.fork()` for seeding outside the HTTP request context.

## Next Steps

- [OAuth Providers](./oauth.md) - Add GitHub, Google, etc.
- [Authentication Overview](./overview.md) - JWT config and protected routes
