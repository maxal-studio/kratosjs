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

## Multi-step login

Login can pause for an extra verification step — like two‑factor authentication — added by a
plugin, not the provider. When a step is required, `POST /auth/login` returns
`{ status: 'challenge', challenge }` instead of a session, and no auth cookie is set until
the user completes it at `POST /auth/challenge`. See
[Extending the Login Flow](/authentication/extending-login) for the hook lifecycle, the
challenge protocol, and the discriminated `LoginResult` shape, and
[Auth Challenge Plugins](/plugins/auth-plugins) for building one (2FA as the example).

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
