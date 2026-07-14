# Creating Plugins

This guide walks you through creating custom plugins for KratosJs, with practical examples.

## Quick Start

Scaffold a standalone plugin package with the CLI:

```bash
# server + React client (the default)
npx @maxal_studio/kratosjs-cli plugin my-plugin

# server-only plugin (no React UI)
npx @maxal_studio/kratosjs-cli plugin my-plugin --no-client
```

Then:

```bash
cd kratosjs-plugin-my-plugin
npm install
npm run build
```

### What gets generated

Plugins scaffold **with the React client by default** (`--no-client` omits the `client`
column below). `@maxal_studio/kratosjs-react`, `react`, and `react-dom` are added as
devDependencies so the client builds immediately.

| Path                           | Purpose                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `src/MyPluginPlugin.ts`        | Plugin class — `getName()` + `register(panel)`                 |
| `src/index.ts`                 | Server entry — re-exports the plugin class                     |
| `package.json`                 | Dual `.`/`./client` exports + a `kratosjs.client` field        |
| `tsconfig.server.json`         | Compiles server code to `dist/server/`                         |
| `src/client/index.tsx`         | Client manifest via `definePluginClient` (field + slot sample) |
| `src/client/MyPluginField.tsx` | Sample custom field component                                  |
| `src/client/MyPluginPanel.tsx` | Sample slot component (rendered under a record's details)      |
| `tsconfig.client.json`         | Compiles client code to `dist/client/`                         |

Register the server plugin in your app's `src/index.ts` via `.plugins([...])`. The
client manifest is **auto-discovered** — the generated `package.json` declares
`"kratosjs": { "client": "kratosjs-plugin-my-plugin/client" }`, and the app's
`virtual:kratos-client` module imports it automatically, so you don't edit
`src/admin/main.tsx` when adding a plugin. (You can still pass it explicitly to
`mountAdminPanel({ plugins: [...] })` if you prefer.)

## Plugin Package Structure

A plugin is an npm package. A typical layout:

```text
my-plugin/
├── package.json          # exports: { ".": server, "./client": client }
├── tsconfig.server.json  # builds src/** (excluding client) to dist/
├── tsconfig.client.json  # builds src/client/** (JSX) to dist/client/
└── src/
    ├── index.ts          # server entry: Plugin class + builder classes
    ├── MyPlugin.ts       # Main plugin class
    ├── MyResource.ts     # Resources (optional)
    ├── MyPage.ts         # Pages (optional)
    ├── myController.ts   # Route handlers (optional)
    ├── entities/         # Driver-agnostic entity factories (optional)
    ├── migrations/sql/   # SQL migrations (optional)
    └── client/
        ├── index.ts      # client entry: definePluginClient manifest (optional)
        └── MyField.tsx   # React components (optional)
```

```json
// package.json essentials
{
	"name": "@my-scope/kratosjs-plugin-my-plugin",
	"type": "commonjs",
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
		"./client": { "types": "./dist/client/index.d.ts", "default": "./dist/client/index.js" }
	},
	"peerDependencies": {
		"@maxal_studio/kratosjs": "^x.x.x"
	}
}
```

Plugins that have no UI components can skip the `./client` entry entirely (see the `logging` and `profile` plugins).

### Peer dependencies

Declare the packages your plugin builds against as **`peerDependencies`**, not regular
`dependencies` — so the plugin reuses the **host app's** copy of KratosJs, MikroORM and
React instead of bundling its own. A second React or `@mikro-orm/core` instance breaks at
runtime (duplicate React → "invalid hook call"; duplicate MikroORM → your entities aren't
found by the host's EntityManager).

`kratosjs plugin <name>` sets the **base** peers (React ones included unless
`--no-client`); add the rest based on what your plugin actually uses:

| If your plugin…                                 | Add these `peerDependencies`                         |
| ----------------------------------------------- | ---------------------------------------------------- |
| Does anything (every plugin)                    | `@maxal_studio/kratosjs`                             |
| Defines MikroORM **entities** / queries the EM  | `@mikro-orm/core`                                    |
| Ships **migrations**                            | `@mikro-orm/migrations` _(mark optional, see below)_ |
| Ships **React** components (a `./client` entry) | `@maxal_studio/kratosjs-react`, `react`              |
| Uses **forms** in its client (custom fields)    | `react-hook-form`                                    |

Use caret ranges matching the host: `@mikro-orm/core: "^7.0.0"`, `react: "^19.0.0"`,
`react-hook-form: "^7.0.0"`. **Don't** list driver packages (`@mikro-orm/mysql`,
`@mikro-orm/mongodb`, …) — the host picks the driver and your entities only need
`@mikro-orm/core`.

**Server-only plugin that owns entities + migrations** (like `logging`, `cms`):

```json
{
	"peerDependencies": {
		"@maxal_studio/kratosjs": "^x.x.x",
		"@mikro-orm/core": "^7.0.0",
		"@mikro-orm/migrations": "^7.0.0"
	},
	"peerDependenciesMeta": {
		"@mikro-orm/migrations": { "optional": true }
	}
}
```

`@mikro-orm/migrations` is marked **optional** because migrations only run on SQL drivers
— a MongoDB host won't install it, and `optional: true` stops npm warning about the
missing peer.

**Plugin with a React client** (like `star-rating`, `profile`):

```json
{
	"peerDependencies": {
		"@maxal_studio/kratosjs": "^x.x.x",
		"@maxal_studio/kratosjs-react": "^x.x.x",
		"react": "^19.0.0",
		"react-hook-form": "^7.0.0"
	}
}
```

Drop `react-hook-form` if your client components don't render form fields. Put a copy of
each peer in `devDependencies` too, so the plugin compiles on its own.

## Driver-Agnostic Entities

If your plugin owns database tables, build entities with the `idProps(driver)` helper so they work on both SQL and MongoDB:

```typescript
// src/entities/Log.ts
import { EntitySchema, idProps, type DriverKind } from '@maxal_studio/kratosjs';

export function createLogEntity(driver: DriverKind) {
	return new EntitySchema({
		name: 'Log',
		properties: {
			...idProps(driver),
			resource: { type: 'string' },
			operation: { type: 'string' },
			timestamp: { type: 'Date', onCreate: () => new Date() },
		} as any,
	});
}
```

```typescript
// src/LoggingPlugin.ts
register(panel: Panel): void {
  const driver = panel.getDriverKind(); // 'sql' | 'mongo'
  const Log = createLogEntity(driver);

  LoggerResource.entity = Log;
  panel.registerEntities([Log]);

  if (driver === 'sql') {
    panel.registerMigrations([Migration20250103000001CreateLogTable]);
  }
  // MongoDB: rely on `updateSchema: true` + idempotent seeding in boot()

  panel.registerResource(LoggerResource);
}
```

> **Relations between two factory entities.** Build the related entity first and pass
> it into the other factory, then reference it with `entity: () => category` — a plain
> string entity name (`entity: 'Category'`) does not resolve during metadata discovery
> for factory-built `EntitySchema`s. See `@maxal_studio/kratosjs-plugin-cms` (Post `m:1`
> Category).

See [Entities & Migrations](./migrations.md) for the full guide — writing SQL migrations, the `boot()` hook, MongoDB notes, and the CMS plugin example.

## Example 1: Simple Page Plugin

Let's create a plugin that adds a custom page:

```typescript
// src/plugins/analytics/AnalyticsPage.ts
import { Page, WidgetBlock } from '@maxal_studio/kratosjs';
import { UserResource } from '../../resources/UserResource';

export class AnalyticsPage extends Page {
	static slug = 'analytics';
	static label = 'Analytics';
	static icon = 'BarChart';
	static navigationSort = 5;

	static async blocks() {
		const userWidgets = UserResource.widgets();
		const blocks = [];

		if (userWidgets) {
			userWidgets.forEach((w: any) => {
				blocks.push(WidgetBlock.make(w).columns(6));
			});
		}

		return blocks;
	}
}
```

```typescript
// src/plugins/analytics/AnalyticsPlugin.ts
import { Plugin, Panel } from '@maxal_studio/kratosjs';
import { AnalyticsPage } from './AnalyticsPage';

export class AnalyticsPlugin extends Plugin {
	getName(): string {
		return 'analytics';
	}

	register(panel: Panel): void {
		panel.registerPage(AnalyticsPage);
	}
}
```

## Example 2: Plugin with Routes

Create a plugin that adds custom API endpoints:

```typescript
// src/plugins/notifications/notificationController.ts
import { KratosRequest, KratosReply } from '@maxal_studio/kratosjs';

export async function getNotifications(req: KratosRequest, reply: KratosReply) Promise<void> {
	try {
		const userId = req.authUser?.id;
		if (!userId) {
			reply.status(401).json({ error: 'Unauthorized' });
			return;
		}

		// Fetch notifications logic here
		const notifications = [];

		reply.json({
			data: notifications,
			count: notifications.length,
		});
	} catch (error: any) {
		reply.status(500).json({ error: error.message });
	}
}
```

```typescript
// src/plugins/notifications/NotificationsPlugin.ts
import { Plugin, Panel, adminRoute } from '@maxal_studio/kratosjs';
import { getNotifications } from './notificationController';

export class NotificationsPlugin extends Plugin {
	getName(): string {
		return 'notifications';
	}

	register(panel: Panel): void {
		// Register admin API routes. `adminRoute(panel)` prefixes the panel base path
		// and requires auth, so the admin client can call them. (`panel.registerRoute`
		// is the deprecated alias for `panel.route(m, p, adminRoute(panel), ...h)`.)
		panel.route('get', '/notifications', adminRoute(panel), getNotifications);
		panel.route(
			'post',
			'/notifications/mark-read',
			adminRoute(panel),
			async (req: KratosRequest, reply: KratosReply) => {
				// Mark notification as read
				reply.json({ success: true });
			},
		);
	}
}
```

## Example 3: Resource Plugin

Create a plugin that adds a new resource:

```typescript
// src/plugins/audit/AuditResource.ts
import { BaseResource, FormBuilder, TableBuilder, TextColumn, TextInput } from '@maxal_studio/kratosjs';
import { AuditLog } from '../../entities/AuditLog';

export class AuditResource extends BaseResource {
	static slug = 'audit-logs';
	static entity = AuditLog;
	static label = 'Audit Log';
	static pluralLabel = 'Audit Logs';
	static icon = 'FileText';
	static navigationGroup = 'System';

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('action').label('Action').readOnly(),
			TextInput.make('userId').label('User ID').readOnly(),
			TextInput.make('timestamp').label('Timestamp').readOnly(),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('action').label('Action').sortable(),
				TextColumn.make('userId').label('User ID').sortable(),
				TextColumn.make('timestamp').label('Timestamp').sortable().dateTime(),
			])
			.defaultSort('timestamp', 'desc');
	}
}
```

```typescript
// src/plugins/audit/AuditPlugin.ts
import { Plugin, Panel } from '@maxal_studio/kratosjs';
import { AuditResource } from './AuditResource';

export class AuditPlugin extends Plugin {
	getName(): string {
		return 'audit';
	}

	register(panel: Panel): void {
		panel.registerResource(AuditResource);
	}
}
```

## Example 4: Hooks Plugin

Create a plugin that adds hooks to existing resources:

```typescript
// src/plugins/activity-tracker/ActivityTrackerPlugin.ts
import { Plugin, Panel, ResourceClass, HookContext } from '@maxal_studio/kratosjs';
import { Activity } from '../../entities/Activity';

export class ActivityTrackerPlugin extends Plugin {
	getName(): string {
		return 'activity-tracker';
	}

	async register(panel: Panel): Promise<void> {
		// Get all registered resources
		const resources = panel.getResources();

		// Add activity tracking hooks to each resource
		for (const [slug, registered] of resources) {
			const ResourceClass = registered.resourceClass;

			panel.registerResourceHooks(ResourceClass, {
				afterCreate: [
					async (ctx: HookContext) => {
						await this.logActivity(ctx, 'create', ResourceClass.getSlug());
					},
				],
				afterUpdate: [
					async (ctx: HookContext) => {
						await this.logActivity(ctx, 'update', ResourceClass.getSlug());
					},
				],
				afterDelete: [
					async (ctx: HookContext) => {
						await this.logActivity(ctx, 'delete', ResourceClass.getSlug());
					},
				],
			});
		}
	}

	private async logActivity(ctx: HookContext, operation: string, resourceSlug: string): Promise<void> {
		try {
			const userId = ctx.http?.request?.authUser?.id;
			const recordId = ctx.output.records?.[0]?._id?.toString();

			await Activity.create({
				resource: resourceSlug,
				operation,
				recordId,
				userId,
				timestamp: new Date(),
			});
		} catch (error) {
			console.error('Error logging activity:', error);
		}
	}
}
```

## Example 5: Complete Plugin (Profile Plugin)

Here's a complete example from the KratosJs codebase - the Profile Plugin:

```typescript
// src/plugins/profile/profileController.ts
import { KratosRequest, KratosReply } from '@maxal_studio/kratosjs';
import { User } from '../../entities/User';
import bcrypt from 'bcrypt';

export async function updateProfile(req: KratosRequest, reply: KratosReply) Promise<void> {
	try {
		const userId = req.authUser?.id;
		if (!userId) {
			reply.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { name, surname, email, phone, profileMediaImage } = req.body;

		// Get media helper
		const formatMediaKey = req.formatMediaKey;
		if (!formatMediaKey) {
			reply.status(500).json({ error: 'Media formatting helper not available' });
			return;
		}

		// Transform media fields
		const updateData: any = { name, surname, email, phone };
		if (profileMediaImage) {
			updateData.profileMediaImage = await formatMediaKey(profileMediaImage);
		}

		const em = req.panel?.getEm();
		const user = await em?.findOne('User', { id: userId });
		if (user) {
			em?.assign(user, updateData);
			await em?.flush();
		}

		if (!user) {
			reply.status(404).json({ error: 'User not found' });
			return;
		}

		reply.json({
			success: true,
			message: 'Profile updated successfully',
			data: user,
		});
	} catch (error: any) {
		reply.status(500).json({ error: error.message || 'Failed to update profile' });
	}
}

export async function changePassword(req: KratosRequest, reply: KratosReply) Promise<void> {
	// Password change logic...
}
```

```typescript
// src/plugins/profile/ProfilePage.ts
import { Page, FormBlock, TabsBlock } from '@maxal_studio/kratosjs';
import { FormBuilder, TextInput, FileUpload } from '@maxal_studio/kratosjs';

export class ProfilePage extends Page {
	static slug = 'profile';
	static label = 'Profile';
	static icon = 'User';
	static navigationSort = 10;

	static async blocks() {
		const profileForm = FormBuilder.make().schema([
			TextInput.make('name').label('Name'),
			TextInput.make('surname').label('Surname'),
			TextInput.make('email').label('Email'),
			FileUpload.make('profileMediaImage').label('Profile Image'),
		]);

		const passwordForm = FormBuilder.make().schema([
			TextInput.make('currentPassword').label('Current Password').type('password'),
			TextInput.make('newPassword').label('New Password').type('password'),
			TextInput.make('confirmPassword').label('Confirm Password').type('password'),
		]);

		return [
			TabsBlock.make([
				{
					label: 'Profile',
					icon: 'User',
					blocks: [
						FormBlock.make(profileForm).title('Edit Profile').submitUrl('/profile/update').columns(12),
					],
				},
				{
					label: 'Password',
					icon: 'Lock',
					blocks: [
						FormBlock.make(passwordForm)
							.title('Change Password')
							.submitUrl('/profile/change-password')
							.columns(12),
					],
				},
			]),
		];
	}
}
```

```typescript
// src/plugins/profile/ProfilePlugin.ts
import { Plugin, Panel, adminRoute } from '@maxal_studio/kratosjs';
import { ProfilePage } from './ProfilePage';
import { updateProfile, changePassword } from './profileController';

export class ProfilePlugin extends Plugin {
	getName(): string {
		return 'profile';
	}

	register(panel: Panel): void {
		// Register page
		panel.registerPage(ProfilePage);

		// Register admin API routes (base-path-prefixed + auth via adminRoute).
		panel.route('post', '/profile/update', adminRoute(panel), updateProfile);
		panel.route('post', '/profile/change-password', adminRoute(panel), changePassword);
	}
}
```

## Using Media Helpers in Plugins

Routes registered via plugins have access to the request's media helper functions:

```typescript
import { KratosRequest, KratosReply, adminRoute } from '@maxal_studio/kratosjs';

register(panel: Panel): void {
  panel.route('post', '/upload-avatar', adminRoute(panel), async (req: KratosRequest, reply: KratosReply) => {
    const formatMediaKey = req.formatMediaKey;
    const resolveMediaUrl = req.resolveMediaUrl;

    const { avatarKey } = req.body;

    // Format media key for storage
    const formatted = await formatMediaKey(avatarKey, 's3-storage');

    // Resolve media URL
    const url = await resolveMediaUrl(formatted);

    reply.json({ url, key: formatted.key });
  });
}
```

## Async Plugin Registration

Plugins can perform async operations during registration:

```typescript
async register(panel: Panel): Promise<void> {
  // Perform async setup
  await initializePlugin();

  // Register resources, pages, etc.
  panel.registerResource(MyResource);
}
```

## Custom Validation Rules

Plugins can add their own validation rules. A rule is defined once as a plain
`RuleDefinition` object and registered on both sides, so it validates
identically in the browser and on the server.

**1. Author the rule once** in a shared module:

```typescript
// src/rules.ts
import type { RuleDefinition } from '@maxal_studio/kratosjs';

export const phoneRule: RuleDefinition = {
	name: 'phone',
	appliesTo: ['string'],
	validate: ({ value }) => /^\+?[0-9 ]{7,}$/.test(String(value)),
	message: ({ label, field }) => `${label || field} must be a valid phone number`,
};
```

`validate` returns `true` (valid), `false` (use the default `message`), or a
`string` (a custom message). `appliesTo` scopes which value kinds the rule runs
against (`'string' | 'number' | 'boolean' | 'array' | 'any'`); omit it for any.
A `:param` suffix (e.g. `phone:US`) arrives as `ctx.param`.

**2. Register it on the server** from the plugin's `register()`:

```typescript
register(panel: Panel): void {
	panel.registerValidationRule('phone', phoneRule);
}
```

**3. Register it on the client** by adding it to the plugin's client manifest:

```typescript
// src/client/index.ts
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import { phoneRule } from '../rules';

export default definePluginClient({
	name: 'my-plugin',
	rules: { phone: phoneRule },
});
```

**4. (Optional) Make it type-safe** so `phone` autocompletes in `.rules([...])`
and typos are caught. Augment the rule registry in your plugin's type
declarations:

```typescript
declare module '@maxal_studio/kratosjs' {
	interface KratosValidationRules {
		phone: true;
	}
}
```

Consumers then use it like any built-in rule:

```typescript
TextInput.make('mobile').rules(['required', 'phone']);
```

> The shared engine is the same one the core rules run through, so a custom rule
> registered on the server is enforced even if a client bypasses the UI.

## Best Practices

1. **Keep plugins focused** - Each plugin should have a single, clear purpose
2. **Use descriptive names** - Plugin names should clearly indicate their functionality
3. **Organize files** - Keep related files together in the plugin directory
4. **Handle errors gracefully** - Wrap operations in try-catch blocks
5. **Document your plugin** - Add comments explaining what the plugin does
6. **Export from index.ts** - Make imports cleaner by exporting from an index file

## Custom Components

Plugins can also ship custom React components (fields, columns, widgets, and blocks) through their `./client` entry. The app statically imports the plugin's client manifest and bundles the components in its admin build — working identically in development and production.

See the [Custom Components Guide](./custom-components.md) for detailed instructions.

## Next Steps

- Learn about [Custom Components](./custom-components.md) in plugins
- Review the [Plugin Overview](./overview.md) for architecture and usage patterns
- Learn about [Resources](../resources/overview.md) and [Pages](../pages/overview.md) to build more powerful plugins
