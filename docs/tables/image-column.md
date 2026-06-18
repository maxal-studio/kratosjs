---
title: Image Column
---

# Image Column

The image column displays images in a table.

## Basic Usage

```typescript
import { ImageColumn } from '@maxal_studio/kratosjs';

ImageColumn.make('avatar');
```

## Circular

Make images circular:

```typescript
ImageColumn.make('avatar').circular();
```

## Square

Make images square:

```typescript
ImageColumn.make('avatar').square();
```

## Width and Height

Set image dimensions:

```typescript
ImageColumn.make('avatar').width(50).height(50);
```

## Ratio

Set aspect ratio:

```typescript
ImageColumn.make('avatar').ratio('1/1');
```

Available ratios: `'16/9'`, `'4/3'`, `'1/1'`, `'9/16'`, etc.

## Disk

Specify storage disk:

```typescript
ImageColumn.make('avatar').disk('s3-bucket');
```

## Visibility

Set visibility:

```typescript
ImageColumn.make('avatar').visibility('public');
```

## Default Image URL

Set a fallback image:

```typescript
ImageColumn.make('avatar').defaultImageUrl('https://example.com/default.png');
```

## Stacked

Stack multiple images:

```typescript
ImageColumn.make('gallery').stacked();
```

## Overlap

Set overlap for stacked images:

```typescript
ImageColumn.make('gallery').stacked().overlap(4);
```

## Ring

Set ring width for stacked images:

```typescript
ImageColumn.make('gallery').stacked().ring(2);
```

## Limit

Limit number of images shown:

```typescript
ImageColumn.make('gallery').limit(3);
```

## Limited Remaining Text

Show remaining count for limited images:

```typescript
ImageColumn.make('gallery').limit(3).limitedRemainingText();
```

## Clickable

Make images clickable to open preview:

```typescript
ImageColumn.make('avatar').clickable('User Avatar');
```

## Open in New Tab

Make images open in new tab:

```typescript
ImageColumn.make('avatar').openInNewTab();
```

## Preview Title

Set preview modal title:

```typescript
ImageColumn.make('avatar').clickable().previewTitle('User Avatar');
```

## Deeplinks

Navigate to resources or pages when clicking the image (takes priority over `clickable()` behavior):

### Navigate to Resource View Modal

```typescript
ImageColumn.make('userAvatar').deeplink({
	resource: 'users',
	id: (value, row) => row.userId,
});
```

### Navigate to Resource Edit Modal

```typescript
ImageColumn.make('userAvatar').deeplink({
	resource: 'users',
	id: (value, row) => row.userId,
	edit: true,
});
```

### Navigate to Page

```typescript
ImageColumn.make('dashboardIcon').deeplink({
	page: 'dashboard',
});
```

**Notes:**

- Deeplinks use React Router for SPA navigation (no page reload)
- Deeplink takes priority over `clickable()` and `openInNewTab()` behaviors
- For resources, the `id` parameter is required and can be:
    - A function with signature `(value, row) => string` where `value` is the column value (image URL) and `row` is the entire record
    - A static string (rare use case)
- Set `edit: true` to open the edit modal instead of view modal
- Cursor pointer styling is automatically applied

## Grid View Full-Width

In grid view, image columns automatically span the full width of the card by default. You can control this behavior:

```typescript
// Default behavior - spans full width in grid view
ImageColumn.make('thumbnail');

// Explicitly set full-width (default for ImageColumn)
ImageColumn.make('thumbnail').gridSpanFull();

// Disable full-width to use normal column width
ImageColumn.make('thumbnail').gridSpanFull(false);
```

**Note:** Image columns default to `gridSpanFull: true`, so they automatically take the full card width in grid view. This provides a better visual experience for images.

## Label

```typescript
ImageColumn.make('avatar').label('Avatar');
```

## Sorting

```typescript
ImageColumn.make('avatar').sortable();
```

## Complete Example

```typescript
ImageColumn.make('avatar')
	.label('Avatar')
	.circular()
	.width(50)
	.height(50)
	.ratio('1/1')
	.clickable('User Avatar')
	.sortable();
```
