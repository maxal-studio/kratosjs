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

Make sure to serve uploaded files statically:

```typescript
import express from 'express';
import path from 'path';

const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));
```

## Complete Example

```typescript
import express from 'express';
import path from 'path';
import { Panel, LocalMediaAdapter } from '@maxal_studio/kratosjs';

const app = express();
const PORT = 3001;

// Serve uploaded files statically
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Create panel with local storage
const adminPanel = Panel.make('admin').mediaAdapters([
	new LocalMediaAdapter({
		name: 'local-uploads',
		uploadPath: uploadsPath,
		publicUrl: `http://localhost:${PORT}/`,
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
