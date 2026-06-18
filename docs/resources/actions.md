---
title: Actions
---

# Actions

Actions allow you to perform operations on individual records (row actions) or multiple records (bulk actions) in a table.

## Row Actions

Row actions appear in each table row and operate on a single record.

### Standard Actions (View / Edit / Delete)

View, edit, and delete are **built in** — KratosJs renders them automatically for every
resource, so you don't add them to `.actions()`. They are controlled by static flags on the
resource class, each defaulting to `true`:

```typescript
export class UserResource extends BaseResource {
	static canView = true; // show the view action (default: true)
	static canEdit = true; // show the edit action (default: true)
	static canDelete = true; // show the delete action (default: true)
	static canCreate = true; // show the "create" header action (default: true)
}
```

Set any flag to `false` to hide the corresponding standard action:

```typescript
export class LogResource extends BaseResource {
	static canCreate = false;
	static canEdit = false;
	static canDelete = false;
	// canView left at its default — records are still viewable
}
```

The `.actions()` array is only for your own custom row actions (below).

### Custom Actions

Create custom actions with forms and confirmation:

```typescript
import { Action, FormBuilder, Toggle, TextInput } from '@maxal_studio/kratosjs';

Action.make('verify')
	.label('Verify')
	.icon('BadgeCheck')
	.color('text-green-600')
	.form(
		FormBuilder.make().schema([
			Toggle.make('isVerified').label('Is Verified').default(false),
			TextInput.make('verifyReason')
				.label('Verification Reason')
				.required()
				.hidden(context => !context.get('isVerified')),
		]),
	)
	.requiresConfirmation()
	.modalDescription('Are you sure you want to verify this user?');
```

### Action Options

All actions support these methods:

#### Label

```typescript
Action.make('archive').label('Archive');
```

#### Icon

```typescript
Action.make('archive').icon('Archive');
```

#### Color

```typescript
Action.make('archive').color('text-gray-600');
```

#### Requires Confirmation

```typescript
Action.make('delete').requiresConfirmation();
```

#### Modal Heading

```typescript
Action.make('delete').modalHeading('Confirm Deletion');
```

#### Modal Description

```typescript
Action.make('delete').modalDescription('Are you sure you want to delete this record?');
```

#### Form

Add a form to collect data before executing the action:

```typescript
Action.make('verify').form(
	FormBuilder.make().schema([
		Toggle.make('isVerified').label('Is Verified'),
		TextInput.make('reason').label('Reason').required(),
	]),
);
```

## Bulk Actions

Bulk actions operate on multiple selected records:

```typescript
import { BulkAction } from '@maxal_studio/kratosjs';

BulkAction.make('delete')
	.label('Delete Selected')
	.icon('Trash2')
	.color('text-red-600')
	.requiresConfirmation()
	.modalDescription('Are you sure you want to delete the selected records?');
```

### Bulk Action Options

Bulk actions support all the same options as row actions, plus:

#### Deselect Records After Completion

```typescript
BulkAction.make('export').deselectRecordsAfterCompletion(false); // Keep selection after action
```

## Action Handlers

Actions are handled in the resource's `actions()` method:

```typescript
static actions(): Record<string, ActionHandler> {
	return {
		verify: async (data: { records?: any[]; formData?: any }) => {
			const { records = [], formData = {} } = data;
			const userIds = records.map(user => user._id || user.id).filter(Boolean);

			await User.updateMany(
				{ _id: { $in: userIds } },
				{
					isVerified: formData.isVerified ?? false,
					verifyReason: formData.verifyReason || null,
				},
			);

			return {
				success: true,
				message: `${userIds.length} user(s) verified successfully`,
			};
		},
		archive: async (data: { records?: any[]; formData?: any }) => {
			const { records = [] } = data;
			const userIds = records.map(user => user._id || user.id).filter(Boolean);

			await User.updateMany(
				{ _id: { $in: userIds } },
				{ archived: true, archivedAt: new Date() },
			);

			return {
				success: true,
				message: `${userIds.length} user(s) archived successfully`,
			};
		},
	};
}
```

### Redirect Actions

```typescript
static actions(): Record<string, ActionHandler> {
	return {
		/**
		 * Redirect to profile page
		 */
		redirectTest: async () => {
			return {
				redirect: `/page/profile`,
				success: true,
			};
		},
	};
}
```

### Action Handler Parameters

The action handler receives an object with:

- **`records`**: Array of selected records (for bulk actions) or single record (for row actions)
- **`formData`**: Data collected from the action form (if a form was provided)

### Action Handler Return Value

Action handlers should return:

```typescript
{
	redirect?: string; // Path where to redirect
	success: boolean;
	message?: string;
	data?: any;
}
```

## Complete Example

View, edit, and delete are rendered automatically (see the `canView` / `canEdit` /
`canDelete` flags above), so `.actions()` only lists custom row actions:

```typescript
import {
	TableBuilder,
	BulkAction,
	Action,
	FormBuilder,
	Toggle,
	TextInput,
} from '@maxal_studio/kratosjs';

static table() {
	return TableBuilder.make()
		.columns([...])
		.actions([
			Action.make('verify')
				.label('Verify')
				.icon('BadgeCheck')
				.color('text-green-600')
				.form(
					FormBuilder.make().schema([
						Toggle.make('isVerified').label('Is Verified').default(false),
						TextInput.make('verifyReason')
							.label('Verification Reason')
							.required()
							.hidden(context => !context.get('isVerified')),
					]),
				)
				.requiresConfirmation()
				.modalDescription('Are you sure you want to verify this user?'),
		])
		.bulkActions([
			BulkAction.make('delete')
				.label('Delete Selected')
				.icon('Trash2')
				.color('text-red-600')
				.requiresConfirmation(),
			BulkAction.make('export')
				.label('Export')
				.icon('Download')
				.color('text-green-600'),
			BulkAction.make('verify')
				.label('Verify Selected')
				.icon('BadgeCheck')
				.color('text-green-600')
				.form(
					FormBuilder.make().schema([
						Toggle.make('isVerified').label('Is Verified').default(false),
						TextInput.make('verifyReason')
							.label('Verification Reason')
							.required()
							.hidden(context => !context.get('isVerified')),
					]),
				)
				.requiresConfirmation(),
		]);
}
```
