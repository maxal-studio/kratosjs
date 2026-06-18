---
title: Text Column
---

# Text Column

The text column displays text data in a table.

## Basic Usage

```typescript
import { TextColumn } from '@maxal_studio/kratosjs';

TextColumn.make('name');
```

## Sorting

```typescript
TextColumn.make('name').sortable();
```

## Searching

Enable search for this column:

```typescript
TextColumn.make('name').searchable();
```

Search across multiple columns (e.g., search in both `name` and `surname` fields):

```typescript
TextColumn.make('name').searchable().searchUsing(['name', 'surname']);
```

When using `searchUsing()`:

- The search query is split by spaces into individual terms
- Each term is searched across all specified fields
- For example, searching "John Doe" will find records where:
    - "John" appears in `name` OR `surname` AND
    - "Doe" appears in `name` OR `surname`
- This enables more flexible search across related fields

## Formatting

### Badge

Display as a badge:

```typescript
TextColumn.make('status').badge().colors({
	active: 'success',
	inactive: 'danger',
});
```

### Money Format

Format as currency:

```typescript
TextColumn.make('price').money('USD');
```

### Date Format

Format as date:

```typescript
TextColumn.make('createdAt').date('YYYY-MM-DD');
```

### Date Time Format

Format as date and time:

```typescript
TextColumn.make('createdAt').dateTime();
```

### Relative Time

Format as relative time (e.g., "2 hours ago"):

```typescript
TextColumn.make('createdAt').since();
```

### Custom Formatting

Use a function to format the value:

```typescript
TextColumn.make('name').formatStateUsing((value, record) => {
	return `${record.firstName} ${record.lastName}`;
});
```

## Styling

### Font Weight

```typescript
TextColumn.make('name').weight('bold');
```

### Font Size

```typescript
TextColumn.make('title').size('lg');
```

### Line Clamp

Limit lines with ellipsis:

```typescript
TextColumn.make('description').lineClamp(3);
```

### HTML Rendering

By default, HTML tags are stripped from text content. To render HTML content:

```typescript
// Render HTML content (e.g., "<strong>Bold</strong>" will display as bold)
TextColumn.make('content').stripHtml(false);
```

To explicitly strip HTML (default behavior):

```typescript
TextColumn.make('content').stripHtml(); // or stripHtml(true)
```

## Deeplinks

Navigate to resources or pages using React Router (avoids full page redirects):

### Navigate to Resource View Modal

```typescript
TextColumn.make('userName')
	.formatStateUsing((value, row) => `${row.user?.name} ${row.user?.surname}`)
	.deeplink({
		resource: 'users',
		id: (value, row) => row.user?._id,
	});
```

### Navigate to Resource Edit Modal

```typescript
TextColumn.make('userName')
	.formatStateUsing((value, row) => row.user?.name)
	.deeplink({
		resource: 'users',
		id: (value, row) => row.user?._id,
		edit: true,
	});
```

### Navigate to Page

```typescript
TextColumn.make('dashboardLink')
	.formatStateUsing(() => 'Go to Dashboard')
	.deeplink({
		page: 'dashboard',
	});
```

**Notes:**

- Deeplinks use React Router for SPA navigation (no page reload)
- For resources, the `id` parameter is required and can be:
    - A function with signature `(value, row) => string` where `value` is the column value and `row` is the entire record
    - A static string (rare use case)
- Set `edit: true` to open the edit modal instead of view modal
- Deeplink text is styled as a link (blue color, underline on hover, cursor pointer)

## Copyable

Make the text copyable:

```typescript
TextColumn.make('apiKey').copyable().copyMessage('Copied!');
```

## Alignment

```typescript
TextColumn.make('amount').alignment('right');
```

## Width

```typescript
TextColumn.make('name').width(200);
```

## Complete Example

```typescript
TextColumn.make('name').label('Full Name').sortable().searchable().weight('bold').copyable();
```
