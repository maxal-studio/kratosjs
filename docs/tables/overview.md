---
title: Overview
---

# Tables

KratosJs tables allow you to display and interact with data in a tabular format.

## Introduction

Table column classes can be found in the `@maxal_studio/kratosjs` package. They reside within the `columns()` method. KratosJs includes a number of columns built-in:

### Display-Only Columns

- [Text Column](/tables/text-column)
- [Icon Column](/tables/icon-column)
- [Image Column](/tables/image-column)
- [Video Column](/tables/video-column)
- [Media Column](/tables/media-column)
- [Color Column](/tables/color-column)
- [Tags Column](/tables/tags-column)
- [Badge Column](/tables/badge-column)
- [View Column](/tables/view-column)

### Editable Columns

Editable columns allow the user to update data in the database without leaving the table:

- [Toggle Column](/tables/toggle-column)
- [Checkbox Column](/tables/checkbox-column)
- [Select Column](/tables/select-column)
- [Text Input Column](/tables/text-input-column)

## Creating a Table

Columns may be created using the static `make()` method, passing the field name:

```typescript
import { TableBuilder, TextColumn } from '@maxal_studio/kratosjs';

const table = TableBuilder.make().columns([
	TextColumn.make('name').label('Name').sortable(),
	TextColumn.make('email').label('Email').sortable(),
]);
```

## Common Column Methods

All columns support common methods:

### Labeling

```typescript
TextColumn.make('name').label('Full Name').tooltip("The user's full name");
```

### Sorting

```typescript
TextColumn.make('name').sortable().sortColumn('name'); // Custom sort column
```

### Searching

```typescript
// Enable search for a single column
TextColumn.make('name').searchable();

// Search across multiple columns (e.g., name and surname)
TextColumn.make('name').searchable().searchUsing(['name', 'surname']);
```

Search supports space-separated terms. For example, searching "John Doe" will find records where both "John" and "Doe" appear across the specified fields.

### Filtering on Related Fields

You can filter on populated relation fields using the `->` separator in query builder constraints:

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
				// Filter on related user fields using '->' separator
				textConstraint('userId->name', 'User Name'),
				textConstraint('userId->surname', 'User Surname'),
			]),
	]);
```

**How it works:**

- The adapter detects fields with `->` separator (e.g., `userId->name`)
- Queries the related entity first to find matching IDs
- Replaces the relation filter with an `$in` query on the foreign key (MongoDB) or subquery (SQL)
- Much more efficient than join-then-filter approaches

**Requirements:**

- The relation must be defined in `.populate()` with the correct `path`
- Use `->` separator for relation fields (e.g., `userId->name`, not `userId.name`)
- The related entity must be registered with MikroORM

**Example query flow:**

```typescript
// User filters: userId->name contains "John"
// 1. Query User entity: { name: /John/i } → finds [id1, id2]
// 2. Query posts: { userId: { $in: [id1, id2] } }
// Result: Only posts by users named "John"
```

### Visibility

Columns can be hidden or made toggleable (allowing users to show/hide them):

```typescript
// Hide a column completely (cannot be shown by users)
TextColumn.make('internalId').hidden();

// Make a column toggleable (users can show/hide it via the column settings button)
TextColumn.make('internalId').toggleable();

// Make a column toggleable but hidden by default
TextColumn.make('_id').label('ID').toggleable(true, true); // Second parameter: isHiddenByDefault
```

**Toggleable Columns:**

- By default, all columns are toggleable (`toggleable: true`)
- Users can show/hide toggleable columns using the column settings button in the table header
- Column visibility preferences are saved in localStorage and persist across page refreshes
- Columns with `hidden: true` cannot be toggled (always hidden)
- Use `.toggleable(true, true)` to make a column toggleable but hidden by default

**Column Settings Button:**

- The column settings button (columns icon) appears in the table header by default
- You can hide it using `.showColumnSettings(false)` on the TableBuilder:

```typescript
TableBuilder.make()
  .columns([...])
  .showColumnSettings(false); // Hide the column settings button
```

### Alignment

```typescript
TextColumn.make('amount').alignment('right');
```

### Width

```typescript
TextColumn.make('name')
	.width(200) // Fixed width in pixels
	.width('20%'); // Percentage width
```

### Grid View Full-Width

Control whether a column spans the full width of the card in grid view:

```typescript
// Make a column span full width in grid view
TextColumn.make('description').gridSpanFull();

// Disable full-width (default for most columns)
TextColumn.make('name').gridSpanFull(false);
```

**Note:** `ImageColumn` and `MediaColumn` default to `gridSpanFull: true` for better visual presentation. All other columns default to `false`.

## Table Features

### Pagination

```typescript
TableBuilder.make().paginate(10).recordsPerPageOptions([10, 25, 50, 100]);
```

### Searching

```typescript
TableBuilder.make().searchable();
```

### Striped Rows

```typescript
TableBuilder.make().striped();
```

### Default Sort

```typescript
TableBuilder.make().defaultSort('createdAt', 'desc');
```

### Relations

You can populate relation data using the populate method:

```typescript
TableBuilder.make().populate([
	{
		path: 'createdBy',
		select: 'name surname profileMediaImage phoneNumber email',
	},
	{
		path: 'transaction',
		select: 'total typeAction senderId receiverId',
		populate: {
			path: 'receiverId',
			select: 'name surname profileMediaImage',
		},
	},
]);
```

Populate paths must match MikroORM relation property names defined on your entities.

### Filters

```typescript
import { SelectFilter, TernaryFilter } from '@maxal_studio/kratosjs';

TableBuilder.make().filters([
	SelectFilter.make('role').options({
		admin: 'Admin',
		user: 'User',
	}),
	TernaryFilter.make('active').trueLabel('Active only').falseLabel('Inactive only'),
]);
```

### Actions

The built-in **view**, **edit**, and **delete** row actions are rendered automatically based on the resource's capability flags — `canView`, `canEdit`, and `canDelete` (all default `true`; see [Resources](/resources/overview)). You do not declare them on the table.

```typescript
// View / Edit / Delete appear automatically. Disable any of them on the resource:
export class PostResource extends BaseResource {
	static canDelete = false; // hides the Delete row action everywhere
}
```

Use `.actions([...])` only for **custom** row actions; they render between Edit and Delete:

```typescript
import { Action } from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([
		/* ... */
	])
	.actions([Action.make('duplicate').label('Duplicate').icon('Copy').requiresConfirmation()]);
```

> Execution of custom (and bulk/header/export) actions can be authorized server-side by plugins via the `actionAccessCheck` hook — hiding a button in the UI is not enough on its own. The Permissions plugin implements this.

### Header Actions

Header actions are buttons rendered in the table toolbar (above the rows), not tied to any specific row. They are ideal for global operations like exporting or importing, and are the primary way plugins add table-wide buttons (see [Global Configuration](/plugins/global-configuration)).

```typescript
import { Action } from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([
		/* ... */
	])
	.headerActions([Action.make('exportCsv').label('Export').icon('Download').exportsTo('csv')]);
```

`exportsTo(format)` marks an action as a file download: clicking it downloads the result of the resource's `/export` endpoint (respecting the current search/filters) instead of running the standard action flow. A matching exporter must be registered for the format via `panel.registerExporter(format, handler)` (see [Global Configuration](/plugins/global-configuration)).

### Export Opt-Out

Tables are exportable by default. To opt a specific resource out of export plugins:

```typescript
TableBuilder.make()
	.columns([
		/* ... */
	])
	.exportable(false);
```

### Grid View

KratosJs tables support both **table view** (traditional rows and columns) and **grid view** (card-based layout). You can configure the grid layout and allow users to toggle between views.

#### Grid Columns Configuration

You can configure the number of columns displayed in grid view using two methods:

**Simple Column Count** (recommended for most cases):

```typescript
TableBuilder.make()
  .columns([...])
  .gridColumns(2); // 2 columns per row in grid view
```

**Responsive Grid Configuration** (for advanced responsive behavior):

```typescript
TableBuilder.make()
  .columns([...])
  .contentGrid({
    'md': 2,  // 2 columns on medium screens and up
    'xl': 3   // 3 columns on extra-large screens
  });
```

The `contentGrid` method accepts breakpoint-based configuration:

- `sm`: Small screens (640px+)
- `md`: Medium screens (768px+)
- `lg`: Large screens (1024px+)
- `xl`: Extra-large screens (1280px+)
- `2xl`: 2X Extra-large screens (1536px+)

**Default:** If neither `gridColumns` nor `contentGrid` is specified, the grid defaults to 2 columns on medium screens and 3 columns on extra-large screens.

#### Default Layout

Set the default layout mode when the table first loads:

```typescript
TableBuilder.make()
  .columns([...])
  .defaultLayout('grid'); // Start in grid view
  // or
  .defaultLayout('table'); // Start in table view (default)
```

**Default:** `'table'`

#### Allow Layout Switching

Enable users to toggle between table and grid views using a toggle button in the table toolbar:

```typescript
TableBuilder.make()
  .columns([...])
  .allowLayoutSwitch(true); // Show layout toggle button
```

**Default:** `false`

When enabled, users can switch between table and grid views, and their preference is saved per resource in localStorage.

#### Complete Grid View Example

```typescript
TableBuilder.make()
	.columns([
		ImageColumn.make('thumbnail').gridSpanFull(), // Full-width image
		TextColumn.make('name').label('Name'),
		TextColumn.make('email').label('Email'),
		TextColumn.make('role').label('Role'),
	])
	.gridColumns(2) // 2 columns per row in grid cards
	.defaultLayout('grid') // Start in grid view
	.allowLayoutSwitch(true); // Allow users to toggle
```

#### Column Full-Width Option

For columns that should span the full width of the grid card (typically media columns like images or videos), use the `gridSpanFull()` method:

```typescript
import { ImageColumn, MediaColumn } from '@maxal_studio/kratosjs';

// Image columns default to full-width in grid view
ImageColumn.make('thumbnail'); // Automatically spans full width

// Media columns also default to full-width
MediaColumn.make('video').type('video'); // Automatically spans full width

// For other columns, explicitly set full-width
TextColumn.make('description').gridSpanFull(); // Spans full width in grid view

// Disable full-width for media columns if needed
ImageColumn.make('thumbnail').gridSpanFull(false); // Normal column width
```

**Default Behavior:**

- `ImageColumn` and `MediaColumn` default to `gridSpanFull: true`
- All other columns default to `gridSpanFull: false`

**Grid Card Layout:**

- In grid view, each record is displayed as a card
- The card body uses a grid layout to display columns
- Full-width columns span the entire card width
- Regular columns are displayed in the configured number of columns (default: 2)
- On mobile devices, the card body always displays 1 column regardless of configuration

## Next Steps

Explore individual column types:

- [Text Column](/tables/text-column)
- [Icon Column](/tables/icon-column)
- [Image Column](/tables/image-column)
- [Video Column](/tables/video-column)
- [Media Column](/tables/media-column)
- [Color Column](/tables/color-column)
- [Tags Column](/tables/tags-column)
- [Badge Column](/tables/badge-column)
- [View Column](/tables/view-column)
- [Toggle Column](/tables/toggle-column)
- [Checkbox Column](/tables/checkbox-column)
- [Select Column](/tables/select-column)
- [Text Input Column](/tables/text-input-column)
- [Filters](/tables/filters)
- [Date Filter](/tables/date-filter)
- [Custom Filter](/tables/custom-filter)
- [Tabs](/tables/tabs)
- [Custom Columns](/tables/custom-columns) - Creating custom table columns
