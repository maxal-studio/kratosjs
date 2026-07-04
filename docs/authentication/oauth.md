---
title: OAuth
---

# OAuth Authentication

KratosJs supports OAuth authentication providers like GitHub, Google, etc.

## GitHub OAuth

```typescript
import { GitHubAuthProvider } from '@maxal_studio/kratosjs';

panel.auth({
	jwt: {
		secret: process.env.JWT_SECRET || 'your-secret-key',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	providers: [
		new GitHubAuthProvider({
			label: 'Sign in with GitHub',
			icon: 'Github',
			clientId: process.env.GITHUB_CLIENT_ID || '',
			clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
			redirectUri: `${process.env.BASE_URL || 'http://localhost:3001'}/kratosjs/api/auth/oauth/github/callback`,
			baseUrl: process.env.BASE_URL || 'http://localhost:3001',
			findUser: async githubProfile => {
				const em = panel.getEm();
				const user = await em.findOne('User', { email: githubProfile.email.toLowerCase() });
				// Return the raw user entity, or null to deny login.
				// serializeUser (configured on auth()) shapes it for the client.
				return user ?? null;
			},
		}),
	],
});
```

`findUser` returns the **raw user entity**; the panel's [`serializeUser`/`extendUser`](/authentication/overview#customizing-the-returned-user)
shapes it into the client-facing user — exactly the same mapping used for email login and
`/auth/me`. There's no per-provider field mapping and no separate `getUserById` shape to keep
in sync.

## Provider Options

Each OAuth provider accepts:

| Option         | Type       | Description                           |
| -------------- | ---------- | ------------------------------------- |
| `label`        | `string`   | Button label on the login page        |
| `icon`         | `string`   | Lucide icon name                      |
| `clientId`     | `string`   | OAuth client ID                       |
| `clientSecret` | `string`   | OAuth client secret                   |
| `redirectUri`  | `string`   | Callback URL registered with provider |
| `baseUrl`      | `string`   | Application base URL                  |
| `findUser`     | `function` | Look up or create user from profile   |

## findUser Return Value

The `findUser` callback returns the raw user entity (the DB row) or `null` to deny login.
Field mapping lives in `serializeUser`, not here — so you never repeat it per provider:

```typescript
findUser: async profile => {
	const em = panel.getEm();
	const user = await em.findOne('User', { email: profile.email.toLowerCase() });
	return user ?? null; // raw entity; serializeUser shapes it (or null to deny)
},
```

## Next Steps

- [Email Auth](./email-auth.md) - Email and password authentication
- [Authentication Overview](./overview.md) - JWT configuration
