---
title: Overview
---

# Authentication

KratosJs provides built-in authentication support with JWT tokens and multiple authentication providers.

## Configuration

Configure authentication in your panel. With `userEntity` set, the email/password
credential check and the user lookup are provided by default:

```typescript
import { EmailAuthProvider } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

panel.auth({
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

`EmailAuthProvider` is the default provider; override its `validateCredentials`, pass your
own `getUserById`, map field names with `userFields`, or add more providers. See
[Email & Password](/authentication/email-auth) for all the overrides.

## JWT Configuration

- **`secret`**: Secret key for signing JWT tokens
- **`accessTokenExpiry`**: Expiry time for access tokens (e.g., '1m', '1h', '7d')
- **`refreshTokenExpiry`**: Expiry time for refresh tokens

## Authentication Providers

KratosJs supports multiple authentication providers:

- [Email Auth](/authentication/email-auth) - Email and password authentication
- [OAuth](/authentication/oauth) - OAuth providers (GitHub, Google, etc.)

## Token Refresh

The frontend automatically handles token refresh when access tokens expire. The refresh happens transparently using the refresh token stored in cookies.

## Protected Routes

Use the `attachAuth()` middleware to protect routes:

```typescript
app.post(panel.getBasePath() + '/custom-endpoint', panel.attachAuth(), async (req, res) => {
	// req.user is available here
	const userId = req.user.id;
	// ...
});
```

## Next Steps

- [Email Auth](/authentication/email-auth) - Set up email/password authentication
- [OAuth](/authentication/oauth) - Set up OAuth providers
