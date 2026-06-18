---
title: Media Column
---

# Media Column (`MediaColumn`)

The `MediaColumn` is a unified column that handles images, videos, and audio content. It can display a single media file or an array of media files with various display options.

```typescript
import { MediaColumn } from '@maxal_studio/kratosjs';

// Static image type
MediaColumn.make('profileImage').type('image').circular().clickable();

// Static video type
MediaColumn.make('videoUrl').type('video').autoplay().controls();

// Dynamic type based on row data
MediaColumn.make('mediaFile')
	.type((value, row) => {
		if (row.isVideoContent) return 'video';
		if (row.isImageContent) return 'image';
		if (row.isAudioContent) return 'audio';
		return null; // Hide if neither
	})
	.thumbnail((value, row) => row.thumbnailUrl);
```

## Available Options

### Media Type

- `make(name: string)`: Creates a new `MediaColumn` instance.
- `type(mediaType: 'image' | 'video' | 'audio' | MediaTypeFn)`: Sets the media type. Can be a static type or a function that returns the type based on row data.

### Common Options

- `label(text: Resolvable<string>)`: Sets the column header label.
- `height(height: string | number)`: Sets the height of the media thumbnail.
- `thumbnail(source: string | ThumbnailFn)`: Sets the thumbnail source. Can be a field name or a function.
- `defaultThumbnail(url: string)`: Sets a default thumbnail URL (for videos).
- `defaultImageUrl(url: string)`: Sets a default image URL (for images).
- `placeholderIcon(icon: string)`: Sets the placeholder icon (Lucide icon name). Defaults to `'Image'` for images, `'Video'` for videos.
- `circular(condition?: boolean)`: Makes the media circular.
- `square(condition?: boolean)`: Makes the media square.
- `ratio(ratio: string)`: Sets the aspect ratio (e.g., `'16/9'`, `'4/3'`, `'1/1'`, `'9/16'`). Defaults to `'16/9'`.

### Click Behavior

- `clickable(title?: string)`: Makes the media clickable to open a preview popup. Optionally sets the preview title.
- `notClickable()`: Disables click behavior.
- `openInNewTab()`: Makes the media clickable to open in a new tab (link mode).
- `previewTitle(title: string)`: Sets the title for the preview modal.

### Video-Specific Options

- `autoplay(condition?: boolean)`: Auto-plays the video when preview opens.
- `controls(condition?: boolean)`: Shows video controls. Defaults to `true`.
- `loop(condition?: boolean)`: Loops video playback.
- `muted(condition?: boolean)`: Mutes the video by default.

### Image Array Options

- `stacked(condition?: boolean)`: Stacks images (for arrays).
- `overlap(overlap: number)`: Sets overlap amount for stacked images.
- `ring(ring: number)`: Sets ring width for stacked images.
- `limit(limit: number)`: Limits the number of images shown (for arrays).
- `limitedRemainingText(condition?: boolean)`: Shows remaining count text for limited images.

### Grid View Full-Width

- `gridSpanFull(condition?: boolean)`: Controls whether the column spans full width in grid view. Defaults to `true` for MediaColumn.

```typescript
// Default behavior - spans full width in grid view
MediaColumn.make('thumbnail').type('image');

// Explicitly set full-width (default for MediaColumn)
MediaColumn.make('thumbnail').type('image').gridSpanFull();

// Disable full-width to use normal column width
MediaColumn.make('thumbnail').type('image').gridSpanFull(false);
```

**Note:** Media columns default to `gridSpanFull: true`, so they automatically take the full card width in grid view. This provides a better visual experience for media content.

### Standard Column Options

- `sortable(condition?: Resolvable<boolean>)`: Enables sorting.
- `searchable(condition?: Resolvable<boolean>)`: Enables searching.
- `hidden(condition?: Resolvable<boolean>)`: Hides the column.
- `disabled(condition?: Resolvable<boolean>)`: Disables the column.
- `width(width: string | number)`: Sets the column width.
- `alignment(alignment: 'left' | 'center' | 'right')`: Sets alignment.
- `toggleable(condition?: Resolvable<boolean>)`: Allows column visibility to be toggled.
- `description(text: Resolvable<string>)`: Adds a description below the column label.

## Dynamic Media Type

Use a function to determine the media type based on row data:

```typescript
MediaColumn.make('mediaFile').type((value, row) => {
	if (row.fileType === 'video') return 'video';
	if (row.fileType === 'image') return 'image';
	if (row.fileType === 'audio') return 'audio';
	return null; // Hide if unknown type
});
```

## Image Arrays

Display multiple images with stacking:

```typescript
MediaColumn.make('gallery').type('image').stacked().overlap(4).ring(2).limit(3).limitedRemainingText();
```

## Complete Examples

### Image Column

```typescript
MediaColumn.make('profileImage')
	.label('Profile Image')
	.type('image')
	.circular()
	.height(50)
	.clickable('Profile Image Preview')
	.defaultImageUrl('/default-avatar.jpg');
```

### Video Column

```typescript
MediaColumn.make('videoUrl')
	.label('Video')
	.type('video')
	.height(150)
	.ratio('16/9')
	.autoplay()
	.controls()
	.loop()
	.muted()
	.previewTitle('Video Preview');
```

### Media Array with Stacking

```typescript
MediaColumn.make('mediaFiles')
	.label('Media Files')
	.type('image')
	.stacked()
	.overlap(4)
	.ring(2)
	.limit(5)
	.limitedRemainingText()
	.clickable();
```
