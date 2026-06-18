---
title: Filters
---

# Filters

Filters allow users to filter table data. KratosJs provides three types of filters: SelectFilter, TernaryFilter, and QueryBuilderFilter.

## SelectFilter

SelectFilter provides a dropdown to filter by specific values.

### Basic Usage

```typescript
import { SelectFilter } from '@maxal_studio/kratosjs';

SelectFilter.make('role').label('Role').options({
	admin: 'Admin',
	user: 'User',
	guest: 'Guest',
});
```

### Options

Set the available filter options:

```typescript
SelectFilter.make('role').options({
	admin: 'Administrator',
	user: 'User',
	guest: 'Guest',
});
```

### Placeholder

Set placeholder text:

```typescript
SelectFilter.make('role')
	.options({...})
	.placeholder('All roles');
```

### Multiple Selection

Allow multiple selections:

```typescript
SelectFilter.make('tags')
	.options({
		frontend: 'Frontend',
		backend: 'Backend',
		design: 'Design',
	})
	.multiple();
```

### Label

```typescript
SelectFilter.make('role').label('Role');
```

## TernaryFilter

TernaryFilter provides three states: true, false, and all (null).

### Basic Usage

```typescript
import { TernaryFilter } from '@maxal_studio/kratosjs';

TernaryFilter.make('active')
	.label('Active Status')
	.placeholder('All')
	.trueLabel('Active only')
	.falseLabel('Inactive only');
```

### Placeholder

Set placeholder text for the "all" state:

```typescript
TernaryFilter.make('active').placeholder('All users');
```

### True Label

Set label for true state:

```typescript
TernaryFilter.make('active').trueLabel('Active only');
```

### False Label

Set label for false state:

```typescript
TernaryFilter.make('active').falseLabel('Inactive only');
```

### Nullable

Control if the "all" option is available:

```typescript
TernaryFilter.make('active').nullable(false); // Remove "all" option
```

### Label

```typescript
TernaryFilter.make('active').label('Active Status');
```

## QueryBuilderFilter

QueryBuilderFilter provides advanced filtering with complex conditions.

### Basic Usage

```typescript
import { QueryBuilderFilter, textConstraint, numberConstraint, selectConstraint } from '@maxal_studio/kratosjs';

QueryBuilderFilter.make('advanced')
	.label('Advanced Filters')
	.constraints([
		textConstraint('name', 'Name'),
		textConstraint('email', 'Email'),
		numberConstraint('coins', 'Coins'),
		selectConstraint('role', 'Role', {
			admin: 'Admin',
			user: 'User',
		}),
	]);
```

### Constraint Helpers

KratosJs provides helper functions to create common constraints:

#### textConstraint

```typescript
textConstraint('name', 'Name');
```

Operators: `equals`, `notEquals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`

#### numberConstraint

```typescript
numberConstraint('coins', 'Coins');
```

Operators: `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `between`, `notBetween`, `isNull`, `isNotNull`

#### selectConstraint

```typescript
selectConstraint('role', 'Role', {
	admin: 'Admin',
	user: 'User',
});
```

Operators: `equals`, `notEquals`, `in`, `notIn`

#### booleanConstraint

```typescript
booleanConstraint('active', 'Is Active');
```

Operators: `equals`, `notEquals`

#### dateConstraint

```typescript
dateConstraint('createdAt', 'Created At');
```

Operators: `equals`, `notEquals`, `before`, `after`, `between`, `isNull`, `isNotNull`

### Custom Constraints

Create custom constraints:

```typescript
QueryBuilderFilter.make('advanced').constraints([
	{
		name: 'customField',
		label: 'Custom Field',
		dataType: 'text',
		operators: [
			{ name: 'equals', label: 'Equals' },
			{ name: 'contains', label: 'Contains' },
		],
	},
]);
```

### Constraint Picker Columns

Set the number of columns for the constraint picker:

```typescript
QueryBuilderFilter.make('advanced').constraintPickerColumns(2);
```

### Constraint Picker Width

Set the width of the constraint picker:

```typescript
QueryBuilderFilter.make('advanced').constraintPickerWidth('300px');
```

### Searching Related Fields

You can filter on populated relation fields using the `->` separator in query builder constraints. This allows you to search across related data efficiently.

#### Requirements

1. **Define the relation in populate**: The relation must be defined in `.populate()` with the correct `path`
2. **Use `->` separator**: Use `->` instead of `.` to denote relation paths (e.g., `userId->name`, not `userId.name`)
3. **Register the entity**: The related entity must be registered with MikroORM via a resource or plugin

#### Example: Filtering on Related Fields

```typescript
import { TableBuilder, QueryBuilderFilter, textConstraint } from '@maxal_studio/kratosjs';

TableBuilder.make()
	.populate([{ path: 'userId', select: 'name surname' }])
	.columns([...])
	.filters([
		QueryBuilderFilter.make('advancedSearch')
			.label('Advanced Search')
			.constraints([
				textConstraint('title', 'Title'),
				textConstraint('description', 'Description'),
				textConstraint('userId->name', 'User Name'),
				textConstraint('userId->surname', 'User Surname'),
			]),
	]);
```

#### How It Works

When you use a constraint with the `->` separator (e.g., `userId->name`):

1. **Backend Processing**: The adapter detects the `->` separator in the field name
2. **Related Entity Query**: It queries the related entity (e.g., `User`) first to find matching IDs
3. **Main Collection Filter**: It replaces the relation filter with an `$in` query on the foreign key
4. **Result**: Only records matching the related field criteria are returned

#### Example Query Flow

```typescript
// User filters: userId->name contains "John"
// 1. Query User entity: { name: /John/i } → finds [id1, id2]
// 2. Query posts: { userId: { $in: [id1, id2] } }
// Result: Only posts by users named "John"
```

#### Important Notes

- **Always use `->` separator**: Never use `.` for relation fields as it conflicts with MongoDB's native dot notation for embedded JSON values
- **Model is required**: The relation must have the `model` parameter in `.populate()` for the filtering to work
- **Works with all constraint types**: You can use `textConstraint`, `numberConstraint`, `selectConstraint`, etc. with related fields
- **Efficient filtering**: This approach queries related collections first, making it much more efficient than join-then-filter approaches

## Using Filters in Tables

Add filters to a table:

```typescript
import {
	TableBuilder,
	SelectFilter,
	TernaryFilter,
	QueryBuilderFilter,
	textConstraint,
	numberConstraint,
	selectConstraint,
} from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([...])
	.filters([
		SelectFilter.make('role')
			.label('Role')
			.options({
				admin: 'Admin',
				user: 'User',
			})
			.placeholder('All roles'),
		TernaryFilter.make('active')
			.label('Active Status')
			.placeholder('All')
			.trueLabel('Active only')
			.falseLabel('Inactive only'),
		QueryBuilderFilter.make('advanced')
			.label('Advanced Filters')
			.constraints([
				textConstraint('name', 'Name'),
				textConstraint('email', 'Email'),
				numberConstraint('coins', 'Coins'),
				selectConstraint('role', 'Role', {
					admin: 'Admin',
					user: 'User',
				}),
			]),
	]);
```

## Filter Layout

Set the filter layout:

```typescript
TableBuilder.make()
	.filtersLayout('dropdown') // or 'inline', 'sidebar'
	.filters([...]);
```

## Complete Example

```typescript
import {
	TableBuilder,
	SelectFilter,
	TernaryFilter,
	QueryBuilderFilter,
	textConstraint,
	numberConstraint,
	selectConstraint,
} from '@maxal_studio/kratosjs';

TableBuilder.make()
	.populate([{ path: 'userId', select: 'name surname' }])
	.columns([...])
	.filters([
		SelectFilter.make('role')
			.label('Role')
			.options({
				admin: 'Admin',
				user: 'User',
				guest: 'Guest',
			})
			.placeholder('All roles')
			.multiple(),
		TernaryFilter.make('active')
			.label('Active Status')
			.placeholder('All')
			.trueLabel('Active only')
			.falseLabel('Inactive only'),
		QueryBuilderFilter.make('advanced')
			.label('Advanced Filters')
			.constraints([
				textConstraint('name', 'Name'),
				textConstraint('email', 'Email'),
				numberConstraint('coins', 'Coins'),
				selectConstraint('role', 'Role', {
					admin: 'Admin',
					user: 'User',
				}),
				// Filter on related user fields
				textConstraint('userId->name', 'User Name'),
				textConstraint('userId->surname', 'User Surname'),
			]),
	]);
```
