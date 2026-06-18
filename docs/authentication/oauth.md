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

				if (!user) {
					// User does not exist - return null to deny login
					return null;
				}

				let avatarUrl: string | undefined;
				if (user.profileMediaImage) {
					avatarUrl = await resolveMediaUrl(user.profileMediaImage);
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					avatarUrl,
				};
			},
		}),
	],
	getUserById: async (id: string) => {
		const em = panel.getEm();
		const user = await em.findOne('User', { id });
		if (!user) return null;

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			avatarUrl: user.avatarUrl,
		};
	},
});
```

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

The `findUser` callback should return a user object or `null` to deny login:

```typescript
findUser: async profile => {
	const em = panel.getEm();
	const user = await em.findOne('User', { email: profile.email.toLowerCase() });
	if (!user) return null;

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
	};
},
```

## Next Steps

- [Email Auth](./email-auth.md) - Email and password authentication
- [Authentication Overview](./overview.md) - JWT configuration
