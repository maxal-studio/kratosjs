---
title: Extending Login
---

# Extending the Login Flow

The login flow is **provider-agnostic and extensible**. Plugins can intercept it and add
steps — like two‑factor authentication, email verification, captcha, device approval, or a
forced password rotation — without modifying any `AuthProvider` (email, OAuth, or your own
custom adapter).

There are two layered extension points, both registered on the panel after `panel.auth()`:

| API                                     | Use it for                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `panel.registerAuthHook(hooks)`         | Low‑level, cross‑cutting concerns: rate limiting, audit logging, captcha, mutating the user object.                  |
| `panel.registerAuthChallenge(provider)` | The common "pause login until the user passes a verification step" case (e.g. 2FA). Built on top of the hook engine. |

## The login response is a discriminated union

Because login can now pause, `POST /auth/login` (and `POST /auth/challenge`) return a
**discriminated union** instead of always returning a user + tokens:

```ts
type LoginResult =
	// authenticated immediately — the session cookie is set
	| { status: 'authenticated'; user: AuthUser; tokens: { expiresIn: number } }
	// one or more challenges must be satisfied before any token is issued
	| { status: 'challenge'; challenge: { type: string; challengeToken: string; data?: unknown } };
```

When `status` is `'challenge'`, **no `kratosjs_access_token` / `kratosjs_refresh_token`
cookie is set**. The `challengeToken` is a short‑lived (5‑minute) signed JWT — a
"half‑authenticated continuation token". The client must echo it back to
`POST /auth/challenge`; it is **not** a session credential and can never authenticate a
normal request.

## The flow

```
POST /auth/login
  → runHooks('beforeAuthenticate')
  → provider.authenticate(credentials) → raw entity
  → serializeUser(entity) → user
  → runHooks('afterAuthenticate')
  → for each registered challenge: isRequired(user)?
       • none required → issue tokens, set cookies → { status: 'authenticated' }
       • one+ required → sign a challengeToken     → { status: 'challenge' }

POST /auth/challenge  { challengeToken, type, payload }
  → verify the challengeToken (short-lived, type:'challenge')
  → challenge.verify(user, payload)?
       • more challenges remain → return the next   { status: 'challenge' }
       • none remain → issue tokens, set cookies     → { status: 'authenticated' }
```

## Lifecycle hooks

`registerAuthHook` accepts any subset of these ordered, async‑capable hooks. They run for
**every** provider, in registration order.

```ts
panel.registerAuthHook({
	name: 'login-audit',
	beforeAuthenticate: async ctx => {
		// ctx: { provider, req, credentials?, getEm }
		// throw here to reject the attempt (e.g. rate limit exceeded)
	},
	afterAuthenticate: async (user, ctx) => {
		/* may mutate user */
	},
	beforeIssueTokens: async (user, ctx) => {},
	afterIssueTokens: async (user, tokens, ctx) => {},
	onLoginSuccess: async (user, ctx) => {},
	onLoginFailure: async (error, ctx) => {},
	beforeLogout: async ctx => {},
	afterLogout: async ctx => {},
});
```

## Challenge providers

A challenge provider is the ergonomic way to add a verification step. KratosJs handles the
challenge token, the pause/resume state machine, and chaining multiple challenges — you only
implement the three callbacks:

```ts
panel.registerAuthChallenge({
	type: 'email-code',
	// Should this user be challenged?
	isRequired: async (user, ctx) => userNeedsEmailVerification(user),
	// Verify the user's response. Return true to pass.
	verify: async (user, payload, ctx) => checkCode(user, (payload as any).code),
	// Optional non-secret data sent to the client with the challenge (never secrets).
	getChallengeData: async (user, ctx) => ({ sentTo: maskEmail(user.email) }),
});
```

Multiple challenge providers chain automatically: the user clears one, the server returns
the next, and tokens are issued only once all are satisfied.

The matching **client UI** is registered in the plugin's client manifest under
`authChallenges` (keyed by the same `type`). See
[Auth Challenge Plugins](/plugins/auth-plugins) for the full server + client pattern, with
2FA as the worked example.

## Notes

- Register hooks and challenges **after** `panel.auth(...)` — both throw otherwise.
- Core ships none of these challenges itself; 2FA lives entirely in
  `@maxal_studio/kratosjs-plugin-2fa`.
- The challenge token is opaque to the frontend — never decode it for trust decisions.
