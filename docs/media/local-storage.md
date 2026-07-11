---
title: Local Storage
---

# Local Storage

Local storage adapter stores files on the local filesystem.

## Configuration

```typescript
import { LocalMediaAdapter } from '@maxal_studio/kratosjs';
import path from 'path';

const adminPanel = Panel.make('admin').mediaAdapters([
	new LocalMediaAdapter({
		name: 'local-uploads',
		uploadPath: path.join(process.cwd(), 'uploads'),
		publicUrl: `http://localhost:${PORT}/`,
		createDirectories: true,
		isDefault: true,
	}),
]);
```

## Adapter Options

- **`name`**: Unique name for the adapter
- **`uploadPath`**: Directory path where files will be stored
- **`publicUrl`**: Base URL for accessing uploaded files
- **`createDirectories`**: Automatically create directories if they don't exist
- **`isDefault`**: Set as the default adapter (used when no disk is specified)

## Serving Static Files

The panel serves the upload directory statically for you: registering a
`LocalMediaAdapter` automatically mounts its `uploadPath` at the path derived from
`publicUrl`. For any extra static directories use `useStatic()`:

```typescript
adminPanel.useStatic('/files', path.join(process.cwd(), 'files'));
```

## Complete Example

```typescript
import path from 'path';
import { Panel, LocalMediaAdapter } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';

const PORT = 3001;
const uploadsPath = path.join(process.cwd(), 'uploads');

// Create panel with local storage (the /uploads static mount is set up automatically)
const adminPanel = Panel.make('admin')
	.httpAdapter(new ExpressAdapter())
	.mediaAdapters([
		new LocalMediaAdapter({
			name: 'local-uploads',
			uploadPath: uploadsPath,
			publicUrl: `http://localhost:${PORT}/uploads`,
			createDirectories: true,
			isDefault: true,
		}),
	]);
```

## File Structure

Files will be stored in the specified `uploadPath` directory:

```
uploads/
  ├── 2024/
  │   ├── 01/
  │   │   └── file-1234567890-abc123.png
  │   └── 02/
  │       └── file-1234567891-def456.jpg
  └── ...
```

## Using in Forms

```typescript
FileUpload.make('avatar').image().disk('local-uploads'); // Optional: specify adapter name
```
