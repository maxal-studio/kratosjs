---
title: Hooks
---

# Hooks

Hooks allow you to execute code at specific points in the resource lifecycle. They're useful for data transformation, validation, logging, and side effects.

## Available Hooks

KratosJs provides the following lifecycle hooks:

- **`beforeCreate`**: Executed before creating a new record
- **`afterCreate`**: Executed after creating a new record
- **`beforeUpdate`**: Executed before updating a record
- **`afterUpdate`**: Executed after updating a record
- **`beforeDelete`**: Executed before deleting a record
- **`afterDelete`**: Executed after deleting a record
- **`beforeList`**: Executed before listing records
- **`afterList`**: Executed after listing records
- **`beforeListRelated`**: Executed before listing related records (hasMany relations)
- **`afterListRelated`**: Executed after listing related records
- **`beforeFindById`**: Executed before fetching a single record by ID
- **`afterFindById`**: Executed after fetching a single record by ID
- **`beforeValidate`**: Executed before schema validation in create/update
- **`afterValidate`**: Executed after schema validation, with the validated data on `input.data`
- **`beforeAction`**: Executed before a custom/bulk/header action handler runs
- **`afterAction`**: Executed after a custom action handler returns
- **`onError`**: Executed once when any operation (including a thrown hook) fails

## Hook Context

Each hook receives a `HookContext` object with:

- **`operation`**: The current operation — `'create' | 'update' | 'delete' | 'list' | 'listRelated' | 'findById' | 'action'`
- **`input`**: The input data
    - `data`: Array of records being processed (also the data to validate)
    - `ids`: Target record IDs (update/delete/findById/action)
    - `params`: Query parameters for list operations
- **`output`**: The output data (populated after the operation)
    - `records`: Array of created/updated/deleted/listed records
    - `previous`: Previous state of records (for updates)
    - `action`: Result returned by a custom action handler (for the `action` operation)
- **`action`**: For the `action` operation — `{ name, formData }` describing the action being run
- **`adapter`**: The data adapter instance
- **`resourceClass`**: The resource class being operated on
- **`user`**: The authenticated user (if available)
- **`context`**: The request context (query, body, headers, `resolveMediaUrl`, etc.)
- **`error`**: The thrown error (set only for `onError` hooks)

## Defining Hooks

Hooks are defined in the resource's `hooks()` method:

```typescript
import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';

static hooks(): ResourceHooks {
	return {
		beforeCreate: [
			async (ctx: HookContext) => {
				// Transform data before creation
				if (ctx.input.data?.[0]) {
					const data = ctx.input.data[0];
					data.name = capitalize(data.name);
				}
			},
		],
		afterCreate: [
			async (ctx: HookContext) => {
				// Perform side effects after creation
				const record = ctx.output.records?.[0];
				if (record) {
					console.log('Created record:', record._id);
				}
			},
		],
	};
}
```

## Before Hooks

Before hooks can modify the input data before the operation:

```typescript
beforeCreate: [
	async (ctx: HookContext) => {
		// Normalize data
		if (ctx.input.data?.[0]) {
			const data = ctx.input.data[0];
			data.email = data.email.toLowerCase().trim();
			data.name = capitalize(data.name);
		}
	},
],
beforeUpdate: [
	async (ctx: HookContext) => {
		// Add updated timestamp
		if (ctx.input.data?.[0]) {
			ctx.input.data[0].updatedAt = new Date();
		}
	},
],
beforeDelete: [
	async (ctx: HookContext) => {
		// Prevent deletion if conditions not met
		const record = ctx.input.data?.[0];
		if (record?.isProtected) {
			throw new Error('Cannot delete protected record');
		}
	},
],
```

## List Hooks

List hooks can modify queries and results:

```typescript
beforeList: [
	async (ctx: HookContext) => {
		// Modify query before execution
		if (ctx.input.query) {
			ctx.input.query.active = true; // Only show active records
		}
	},
],
afterList: [
	async (ctx: HookContext) => {
		// Transform results after fetching
		if (ctx.output.records) {
			ctx.output.records = ctx.output.records.map(record => ({
				...record,
				fullName: `${record.name} ${record.surname}`,
			}));
		}
	},
],
```

## List Related Hooks

`listRelated` runs when fetching related records (hasMany relations). It has its own
hooks and emits `operation: 'listRelated'`, so you can treat related listings differently
from top-level lists:

```typescript
beforeListRelated: [
	async (ctx: HookContext) => {
		// Scope the related query (params hold the relation + filters)
		if (ctx.input.params) {
			ctx.input.params.filters = { ...ctx.input.params.filters, archived: false };
		}
	},
],
afterListRelated: [
	async (ctx: HookContext) => {
		console.log(`Fetched ${ctx.output.records.length} related records`);
	},
],
```

## Validate Hooks

`beforeValidate` / `afterValidate` wrap schema validation in create and update. The data
being validated is on `ctx.input.data[0]` — `afterValidate` sees the validated result and
can still adjust it before it reaches the database:

```typescript
beforeValidate: [
	async (ctx: HookContext) => {
		// Strip a transient field that the schema would reject
		if (ctx.input.data?.[0]) delete ctx.input.data[0]._confirmPassword;
	},
],
afterValidate: [
	async (ctx: HookContext) => {
		// Derive a value from validated data
		if (ctx.input.data?.[0]) {
			ctx.input.data[0].slug = slugify(ctx.input.data[0].title);
		}
	},
],
```

## Action Hooks

Custom, bulk, and header actions run through `beforeAction` / `afterAction` with
`operation: 'action'`. The `ctx.action` section identifies the action, `ctx.input.data`
holds the target records, and `ctx.output.action` holds the handler's return value:

```typescript
beforeAction: [
	async (ctx: HookContext) => {
		// Gate or audit a specific action
		if (ctx.action?.name === 'publish') {
			console.log(`Publishing ${ctx.input.data?.length} records`);
		}
	},
],
afterAction: [
	async (ctx: HookContext) => {
		// Inspect the action result
		console.log(`Action ${ctx.action?.name} returned`, ctx.output.action);
	},
],
```

## After Hooks

After hooks can access the created/updated/deleted records:

```typescript
afterCreate: [
	async (ctx: HookContext) => {
		// Send notification
		const record = ctx.output.records?.[0];
		if (record) {
			await sendWelcomeEmail(record.email);
		}
	},
],
afterUpdate: [
	async (ctx: HookContext) => {
		// Log changes
		const record = ctx.output.records?.[0];
		if (record) {
			await logChange(record._id, 'updated');
		}
	},
],
afterDelete: [
	async (ctx: HookContext) => {
		// Cleanup related data
		const record = ctx.output.records?.[0];
		if (record) {
			await cleanupRelatedData(record._id);
		}
	},
],
```

## Multiple Hooks

You can define multiple hooks for the same event:

```typescript
beforeCreate: [
	async (ctx: HookContext) => {
		// First hook: Normalize data
		if (ctx.input.data?.[0]) {
			ctx.input.data[0].email = ctx.input.data[0].email.toLowerCase();
		}
	},
	async (ctx: HookContext) => {
		// Second hook: Validate
		if (ctx.input.data?.[0]) {
			if (!ctx.input.data[0].email.includes('@')) {
				throw new Error('Invalid email');
			}
		}
	},
	async (ctx: HookContext) => {
		// Third hook: Set defaults
		if (ctx.input.data?.[0]) {
			ctx.input.data[0].createdAt = new Date();
		}
	},
],
```

Hooks are executed in order, so each hook can see the modifications made by previous hooks.

## Error Handling

If a hook throws an error, the operation is aborted:

```typescript
beforeDelete: [
	async (ctx: HookContext) => {
		const record = ctx.input.data?.[0];
		if (record?.isLocked) {
			throw new Error('Cannot delete locked record');
		}
	},
],
```

When any operation fails — whether the error is thrown by a before/after hook or by the
adapter — your `onError` hooks run **exactly once** with `ctx.error` set, then the error is
rethrown to the caller:

```typescript
onError: [
	async (ctx: HookContext) => {
		console.error(`[${ctx.operation}] failed:`, ctx.error?.message);
	},
],
```

## Complete Example

```typescript
import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';

const capitalize = (str: string | undefined): string => {
	if (!str || typeof str !== 'string') return str || '';
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const userHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			// Normalize name and surname
			if (ctx.input.data?.[0]) {
				const data = ctx.input.data[0];
				if (data.name) {
					data.name = capitalize(data.name);
				}
				if (data.surname) {
					data.surname = capitalize(data.surname);
				}
			}
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			// Normalize name and surname
			if (ctx.input.data?.[0]) {
				const data = ctx.input.data[0];
				if (data.name) {
					data.name = capitalize(data.name);
				}
				if (data.surname) {
					data.surname = capitalize(data.surname);
				}
			}
		},
	],
	afterCreate: [
		async (ctx: HookContext) => {
			// Send welcome email
			const record = ctx.output.records?.[0];
			if (record?.email) {
				await sendWelcomeEmail(record.email);
			}
		},
	],
};

export class UserResource extends BaseResource {
	// ...
	static hooks() {
		return userHooks;
	}
}
```
