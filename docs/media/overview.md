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

KratosJs provides generic media upload/delete endpoints. They come in a global form and a per-resource form:

```typescript
// Global (used by non-resource uploads — page builder, settings, etc.)
// POST /kratosjs/api/media/upload
// POST /kratosjs/api/media/delete

// Per-resource (used by FileUpload fields inside a resource form)
// POST /kratosjs/api/:resource/media/upload
// POST /kratosjs/api/:resource/media/delete
```

## Authorization & Hooks

All media endpoints require authentication. On top of that:

- **Per-resource routes** require **write access** to the resource — the user must be able to
  create _or_ edit it. Deleting media here means "remove/replace a file while editing a record",
  so it does **not** require the record `delete` permission (an editor who cannot delete records
  can still replace an image). This reuses the same capability pipeline as CRUD, so the
  [permissions plugin](/plugins/overview) governs it automatically.
- **Global routes** have no resource context (they back page/block/settings uploads), so they are
  authenticated by default and authorized through the media hooks below.

### Authorization hooks

Two single-handler hooks gate uploads and deletes. Each is optional — when unset, the request
is allowed (subject to the per-resource write check above). Returning `false` yields a `403`.
They're the only policy gate the **global** routes get beyond authentication, and the guard
against arbitrary-key deletion.

```typescript
register(panel: Panel): void {
  // Authorize / validate an upload. Returning false yields a 403.
  panel.registerMediaUploadAccessCheckHook(async (ctx) => {
    // ctx: { operation, user, resourceSlug?, fieldName?, filename?, contentType?, ... }
    return ctx.user?.role === 'editor';
  });

  // Authorize a deletion — verify the requesting user actually owns ctx.key.
  panel.registerMediaDeleteAccessCheckHook(async (ctx) => {
    return await mediaIsOwnedBy(ctx.key, ctx.user?.id);
  });
}
```

### Lifecycle hooks

To **transform** the uploaded bytes (compress, crop, rename), **link** a file to its owner,
**log**, or **audit** failures, register array-based lifecycle hooks — the media analog of
[resource hooks](/resources/hooks). Multiple plugins can stack handlers, and `before*` hooks
mutate the file before it is stored:

```typescript
panel.registerMediaHooks({
	// Transform the bytes before they're stored
	beforeMediaUpload: [
		async ctx => {
			ctx.file = await compress(ctx.file);
		},
	],
	// Observe stored/removed files (track by storage key)
	afterMediaUpload: [async ctx => db.media.track(ctx.result.key)],
	afterMediaDelete: [async ctx => db.media.untrack(ctx.key)],
});
```

See **[Media Hooks](/media/hooks)** for the full lifecycle, the `MediaHookContext` fields, and
worked examples (image compression, key tracking, error auditing).

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
