---
title: Video Column
---

# Video Column (`VideoColumn`)

The `VideoColumn` displays video thumbnails with a preview popup. It shows a thumbnail image or a video icon, and opens a video player popup when clicked.

```typescript
import { VideoColumn } from '@maxal_studio/kratosjs';

VideoColumn.make('videoUrl')
	.label('Video')
	.thumbnail('thumbnailUrl')
	.height(150)
	.circular()
	.autoplay()
	.controls()
	.previewTitle('Video Preview');
```

## Available Options

- `make(name: string)`: Creates a new `VideoColumn` instance.
- `label(text: Resolvable<string>)`: Sets the column header label.
- `height(height: string | number)`: Sets the height of the video thumbnail.
- `thumbnail(source: string | ThumbnailFn)`: Sets the thumbnail source. Can be a field name or a function that returns the thumbnail URL.
- `defaultThumbnail(url: string)`: Sets a default thumbnail URL when no thumbnail is available.
- `placeholderIcon(icon: string)`: Sets the placeholder icon (Lucide icon name) when no thumbnail is available. Defaults to `'Video'`.
- `circular(condition?: boolean)`: Makes the thumbnail circular.
- `square(condition?: boolean)`: Makes the thumbnail square.
- `previewTitle(title: string)`: Sets the title for the preview modal.
- `autoplay(condition?: boolean)`: Auto-plays the video when the preview opens.
- `controls(condition?: boolean)`: Shows video controls. Defaults to `true`.
- `loop(condition?: boolean)`: Loops video playback.
- `muted(condition?: boolean)`: Mutes the video by default.
- `ratio(ratio: string)`: Sets the aspect ratio for the video thumbnail (e.g., `'16/9'`, `'4/3'`, `'1/1'`, `'9/16'`). Defaults to `'16/9'`.
- `sortable(condition?: Resolvable<boolean>)`: Enables sorting for this column.
- `searchable(condition?: Resolvable<boolean>)`: Enables searching for this column.
- `hidden(condition?: Resolvable<boolean>)`: Hides the column.
- `disabled(condition?: Resolvable<boolean>)`: Disables the column.
- `width(width: string | number)`: Sets the column width.
- `alignment(alignment: 'left' | 'center' | 'right')`: Sets alignment.
- `toggleable(condition?: Resolvable<boolean>)`: Allows column visibility to be toggled.
- `description(text: Resolvable<string>)`: Adds a description below the column label.

## Thumbnail Function

You can use a function to dynamically compute the thumbnail URL:

```typescript
VideoColumn.make('videoUrl').thumbnail((value, row) => {
	if (!row.mediaFile?.key) return null;
	return `https://cdn.example.com/${row.mediaFile.key}`;
});
```

## Complete Example

```typescript
VideoColumn.make('animationMedia')
	.label('Animation Media')
	.ratio('1/1')
	.width(150)
	.thumbnail('thumbnailUrl')
	.defaultThumbnail('/default-video-thumbnail.jpg')
	.circular()
	.autoplay()
	.controls()
	.loop()
	.muted()
	.previewTitle('Animation Preview');
```
