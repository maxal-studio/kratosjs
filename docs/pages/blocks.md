---
title: Blocks
---

# Blocks

Blocks are reusable components that can be used to build pages. KratosJs provides several block types:

## WidgetBlock

Display widgets (stats, charts) from resources:

```typescript
import { WidgetBlock } from '@maxal_studio/kratosjs';

const widget = StatsWidget.make('totalUsers')
	.label('Total Users')
	.render(async (em, entity) => em.count(entity, {}));

WidgetBlock.make(widget).columns(3).title('User Statistics');
```

## TableBlock

Display tables with data from custom endpoints:

```typescript
import { TableBlock, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';

const table = TableBuilder.make().columns([
	TextColumn.make('name').label('Name'),
	TextColumn.make('email').label('Email'),
]);

TableBlock.make(table)
	.title('Recent Users')
	.subtitle('Last 10 registered users')
	.dataUrl('dashboard/recent-users')
	.columns(6);
```

### TableBlock Properties

- **`dataUrl`**: API endpoint to fetch table data (relative to `apiBaseUrl`)
- **`title`**: Block title
- **`subtitle`**: Block subtitle
- **`columns`**: Number of columns to span (1-12)

## FormBlock

Display forms that submit to custom endpoints:

```typescript
import { FormBlock, FormBuilder, TextInput } from '@maxal_studio/kratosjs';

const form = FormBuilder.make().schema([
	TextInput.make('name').label('Name').required(),
	TextInput.make('email').label('Email').email().required(),
]);

FormBlock.make(form)
	.title('Edit Profile')
	.subtitle('Update your profile information')
	.submitUrl('profile/update')
	.columns(6);
```

### FormBlock Properties

- **`submitUrl`**: API endpoint to submit form data (relative to `apiBaseUrl`)
- **`title`**: Block title
- **`subtitle`**: Block subtitle
- **`columns`**: Number of columns to span (1-12)

## TabsBlock

Display content in tabs:

```typescript
import { TabsBlock, FormBlock, FormBuilder, TextInput } from '@maxal_studio/kratosjs';

const profileForm = FormBuilder.make().schema([TextInput.make('name').label('Name')]);

const passwordForm = FormBuilder.make().schema([TextInput.make('password').label('Password').type('password')]);

TabsBlock.make()
	.tab(
		'Profile',
		[FormBlock.make(profileForm).submitUrl('profile/update')],
		'User', // Icon
	)
	.tab(
		'Password',
		[FormBlock.make(passwordForm).submitUrl('profile/change-password')],
		'Lock', // Icon
	)
	.defaultTab(0);
```

### TabsBlock Methods

- **`tab(label, blocks, icon?)`**: Add a tab with label, array of blocks, and optional icon
- **`defaultTab(index)`**: Set the default active tab (0-based index)

## Block Layout

Blocks use a 12-column grid system. You can specify how many columns a block should span:

```typescript
// Full width
WidgetBlock.make(widget).columns(12);

// Half width
TableBlock.make(table).columns(6);

// Third width
FormBlock.make(form).columns(4);

// Quarter width
WidgetBlock.make(widget).columns(3);
```

Blocks will automatically wrap to the next row when they exceed 12 columns.

## Block Titles and Subtitles

All blocks support optional titles and subtitles:

```typescript
TableBlock.make(table).title('Recent Users').subtitle('Last 10 registered users').columns(6);
```

Titles and subtitles are displayed at the top of the block.

## Combining Blocks

You can combine different block types in a single page:

```typescript
static async blocks() {
  return [
    // Row 1: 3 widgets, each taking 4 columns
    WidgetBlock.make(widget1).columns(4),
    WidgetBlock.make(widget2).columns(4),
    WidgetBlock.make(widget3).columns(4),

    // Row 2: Table taking full width
    TableBlock.make(table).columns(12),

    // Row 3: Form and table side by side
    FormBlock.make(form).columns(6),
    TableBlock.make(table2).columns(6),
  ];
}
```
