---
title: Overview
---

# Media Management

KratosJs provides flexible media management with support for multiple storage adapters.

## Storage Adapters

KratosJs supports different storage adapters:

- [Local Storage](/media/local-storage) - Store files on the local filesystem
- [S3 Storage](/media/s3-storage) - Store files on AWS S3

## Configuration

Configure media adapters when creating the panel:

```typescript
import { LocalMediaAdapter, S3MediaAdapter } from '@maxal_studio/kratosjs';

const adminPanel = Panel.make('admin').mediaAdapters([
	new LocalMediaAdapter({
		name: 'local-uploads',
		uploadPath: path.join(process.cwd(), 'uploads'),
		publicUrl: `http://localhost:${PORT}/`,
		createDirectories: true,
		isDefault: true,
	}),
	new S3MediaAdapter({
		name: 's3-bucket',
		bucket: process.env.AWS_BUCKET_NAME,
		region: process.env.AWS_REGION,
		uploadPath: 'uploads/',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		publicUrl: process.env.AWS_PUBLIC_URL,
		isDefault: false,
	}),
]);
```

## Media Helpers

Use the `attachMediaHelpers()` middleware to add media helper functions to requests:

```typescript
app.post(adminPanel.getBasePath() + '/upload', adminPanel.attachMediaHelpers(), async (req, res) => {
	// req.formatMediaKey is available
	const mediaKey = await req.formatMediaKey('uploads/file.png');
	// Returns: { key: 'uploads/file.png', bucket: 'default' }
});
```

## Media Upload Endpoint

KratosJs provides a generic media upload endpoint:

```typescript
// Automatically available at: POST /kratosjs/api/media/upload
// Automatically available at: DELETE /kratosjs/api/media/delete
```

## Resolving Media URLs

Use the `resolveMediaUrl()` helper to resolve media URLs:

```typescript
const url = await context.resolveMediaUrl({
	key: 'uploads/file.png',
	bucker: 'default',
});
```

## File Upload Fields

Use the `FileUpload` field in forms:

```typescript
FileUpload.make('avatar').image().disk('s3-bucket'); // Specify storage adapter
```

## Next Steps

- [Local Storage](/media/local-storage) - Configure local file storage
- [S3 Storage](/media/s3-storage) - Configure AWS S3 storage
