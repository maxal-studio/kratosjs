---
title: Auth Challenge Plugins
---

# Auth Challenge Plugins

An auth challenge plugin adds a verification step to the login flow — like two‑factor
authentication — using only the public extension surface. It needs two halves:

1. **Server**: register an `AuthChallengeProvider` (and, usually, enrollment routes + a
   side entity to store state).
2. **Client**: register a UI component under `authChallenges` keyed by the same challenge
   `type`. The host `LoginPage` renders it when the server returns that challenge.

Core knows nothing about the specific challenge — see
[Extending the Login Flow](/authentication/extending-login) for the mechanism. The worked
example below is the bundled `@maxal_studio/kratosjs-plugin-2fa`.

## Server: register the challenge

```ts
import { Plugin, Panel, AuthUser, AuthHookContext } from '@maxal_studio/kratosjs';

export class TwoFactorPlugin extends Plugin {
	getName() {
		return '2fa';
	}

	register(panel: Panel): void {
		// Store the secret on a side entity keyed by userId — never modify the host User.
		panel.registerEntities([
			/* UserTwoFactor */
		]);
		panel.registerMigrations([
			/* CreateUserTwoFactor (SQL only) */
		]);

		panel.registerAuthChallenge({
			type: '2fa-totp',
			isRequired: async (user: AuthUser, ctx: AuthHookContext) => {
				const record = await findSecret(ctx.getEm(), user.id);
				return !!record && record.enabled;
			},
			verify: async (user, payload, ctx) => {
				const record = await findSecret(ctx.getEm(), user.id);
				const code = (payload as { code?: string })?.code;
				return !!record && typeof code === 'string' && verifyTotp(code, record.secret);
			},
			getChallengeData: () => ({}), // nothing sensitive
		});

		// Enrollment routes. registerRoute already applies the request-scoped ORM context
		// AND the auth middleware, so these run only for an authenticated user (req.authUser).
		panel.registerRoute('post', '/auth/2fa/setup', (req, reply) => {
			/* return secret + QR */
		});
		panel.registerRoute('post', '/auth/2fa/enable', (req, reply) => {
			/* verify + enable */
		});
		panel.registerRoute('post', '/auth/2fa/disable', (req, reply) => {
			/* verify + remove */
		});
	}
}
```

Key rules:

- Register the challenge **after** `panel.auth(...)` (the plugin's `register()` runs during
  `panel.start()`, which is after `auth()`).
- Never send the secret to the client from `getChallengeData`.
- Store challenge state on a side entity keyed by user id — the same convention the
  permissions plugin uses for its role relation. Do not patch the host `User` entity.

## Client: register the challenge UI

The plugin's `/client` entry exports a manifest. The challenge component receives
`AuthChallengeProps` and calls `onSubmit` with whatever payload the server's `verify`
expects.

```tsx
// src/client/TwoFactorChallenge.tsx
import { useState } from 'react';
import { Button, Input, Label, ErrorAlert, type AuthChallengeProps } from '@maxal_studio/kratosjs-react';

export function TwoFactorChallenge({ onSubmit, onCancel, error, submitting }: AuthChallengeProps) {
	const [code, setCode] = useState('');
	return (
		<form
			onSubmit={e => {
				e.preventDefault();
				onSubmit({ code });
			}}>
			{error && <ErrorAlert message={error} />}
			<Label htmlFor="code" required>
				Authentication code
			</Label>
			<Input id="code" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
			<Button type="submit" loading={submitting} disabled={code.length < 6}>
				Verify
			</Button>
			<Button type="button" variant="ghost" onClick={onCancel}>
				Back to sign in
			</Button>
		</form>
	);
}
```

```ts
// src/client/index.ts
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import { TwoFactorChallenge } from './TwoFactorChallenge';

export default definePluginClient({
	name: '2fa',
	authChallenges: { '2fa-totp': TwoFactorChallenge },
});
```

`AuthChallengeProps`:

| Prop                | Description                                         |
| ------------------- | --------------------------------------------------- |
| `data`              | Non‑secret data the server sent with the challenge. |
| `onSubmit(payload)` | Submit the user's response; resolves when verified. |
| `onCancel()`        | Abandon the challenge and return to the login form. |
| `error`             | Verification error to display, if any.              |
| `submitting`        | Whether a verification request is in flight.        |

## Wiring it into an app

```ts
// server
import { TwoFactorPlugin } from '@maxal_studio/kratosjs-plugin-2fa';
panel
	.auth({
		/* ... */
	})
	.plugins([new TwoFactorPlugin({ issuer: 'My App' })]);
```

```ts
// client (admin entry)
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import twoFactorClient from '@maxal_studio/kratosjs-plugin-2fa/client';

mountAdminPanel({ plugins: [twoFactorClient] });
```

That is the entire contract. A different challenge (email code, captcha, SMS) is another
`AuthChallengeProvider` + client component — no core changes required.

## Self-service enrollment page

A challenge is only useful if users can turn it on. A plugin can ship its own settings page
the same way any plugin does — a server `Page` that renders a custom block, plus the block's
client component (see [Creating Plugins](/plugins/creating-plugins) and
[Custom Components](/plugins/custom-components)).

The 2FA plugin registers a **"2 Factor Auth"** page under a **Security** navigation group:

```ts
// server: a Page returning a custom block
export class TwoFactorPage extends Page {
  static slug = '2fa';
  static label = '2 Factor Auth';
  static navigationGroup = 'Security';
  static async blocks() { return [TwoFactorSetupBlock.make().columns(12)]; }
}

// in the plugin's register(panel):
panel.registerCustomBlock('two-factor-setup');
panel.registerPage(TwoFactorPage);
panel.registerRoute('get', '/auth/2fa/status', (req, reply) => /* { enabled } for req.authUser */);
```

The block's client component calls the same authenticated `/auth/2fa/*` routes to enroll
(scan QR + confirm a code), report status, and disable — registered in the client manifest's
`blocks`, exactly like any custom block.
