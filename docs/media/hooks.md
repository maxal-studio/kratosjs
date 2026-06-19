---
title: Media Hooks
---

# Media Hooks

Media hooks let you run code around every file upload and deletion — to **transform the
bytes** (compress, crop, re-encode), rename or reroute storage, **link** a file to its
owner, **log**, and **audit** failures. They are the media analog of [resource
hooks](/resources/hooks): array-based handlers that run in registration order, where
`before*` handlers **mutate** the context and `after*` handlers observe the result.

> Media hooks are about the file lifecycle. **Authorization** is a separate, single-handler
> layer — see [Authorization & Hooks](/media/overview#authorization-hooks).

## Available Hooks

- **`beforeMediaUpload`**: Before storage. Mutate `ctx.file` (the buffer), `ctx.filename`,
  `ctx.contentType`, `ctx.path`, `ctx.visibility`, `ctx.bucket`, or `ctx.metadata`. Throw to abort.
- **`afterMediaUpload`**: After storage. Observe `ctx.result` (`{ key, url, bucket }`) — link the file to a user/entity, log, etc.
- **`beforeMediaDelete`**: Before deletion. Inspect `ctx.key`. Throw to abort.
- **`afterMediaDelete`**: After deletion. Observe — remove an owner link, log, etc.
- **`onMediaError`**: Runs once when an upload/delete throws, with `ctx.error` set. Never rethrows (so an audit handler can't mask the original failure).

## Hook Context

Each hook receives one mutable `MediaHookContext`:

- **`operation`**: `'upload' | 'delete'`
- **`user`**: The authenticated user (if available)
- **`resourceSlug`**: The resource the media belongs to — `undefined` for global (non-resource) uploads
- **`fieldName`**, **`recordId`**, **`isArray`**, **`existingValue`**: The form field/record the upload is for (when sent by the client)
- **`bucket`**: Target storage adapter name (mutable in `beforeMediaUpload`)
- **`file`**: _(upload)_ The file **buffer** — replace it in `beforeMediaUpload` to transform the bytes
- **`filename`**, **`contentType`**, **`path`**, **`visibility`**, **`metadata`**: _(upload)_ Storage options, all mutable in `beforeMediaUpload`
- **`key`**: _(delete)_ The storage key being deleted
- **`result`**: Populated after a successful upload — `{ key, url?, bucket? }`
- **`error`**: Set only for `onMediaError` hooks

### Trust boundary

When making **authorization** decisions, mind where each field comes from:

- **Server-trusted**: `user` (from the JWT), `resourceSlug` (from the route), and `key` (the actual storage key on delete).
- **Client hints**: `fieldName`, `recordId`, `isArray`, `existingValue` arrive in the request body on the upload/delete routes and can be forged. `recordId` is also absent on create (the record doesn't exist yet). Use them for logging/UX, **not** to gate access. To securely associate a file with a record, do it at record-save time with a resource `afterCreate`/`afterUpdate` hook (keyed by the returned `key`), or verify `key` ownership in `mediaDeleteAccessCheck`.
- **Exception**: for backend cascade deletes (see below), `resourceSlug`/`recordId` are set by the server and are trustworthy.

### Backend cascade deletes

Media isn't only deleted through the delete route. When a record is **updated** (a file is removed or replaced) or **deleted**, the framework removes the now-orphaned files — and these fire your `beforeMediaDelete` / `afterMediaDelete` / `onMediaError` hooks too, with server-trusted `user` / `resourceSlug` / `recordId`. (The `mediaDeleteAccessCheck` is **not** re-run here — the deletion is a side effect of an already-authorized record operation.) So an `afterMediaDelete` cleanup or audit handler sees every deletion, however it was triggered.

## Defining Hooks

Register media hooks on the panel — typically from a plugin's `register(panel)`:

```typescript
import type { MediaHookContext } from '@maxal_studio/kratosjs';

panel.registerMediaHooks({
	afterMediaUpload: [
		async (ctx: MediaHookContext) => {
			console.log('Stored', ctx.result?.key, 'for', ctx.resourceSlug);
		},
	],
});
```

## Transforming Uploads

`beforeMediaUpload` runs before the file is stored, so replacing `ctx.file` changes what
actually lands in the bucket. For example, compress images with `sharp`:

```typescript
import sharp from 'sharp';

panel.registerMediaHooks({
	beforeMediaUpload: [
		async (ctx: MediaHookContext) => {
			if (!ctx.contentType?.startsWith('image/') || !ctx.file) return;

			// Re-encode to a smaller WebP and rewrite the related options
			ctx.file = await sharp(ctx.file)
				.rotate()
				.resize({ width: 1600, withoutEnlargement: true })
				.webp({ quality: 80 })
				.toBuffer();
			ctx.contentType = 'image/webp';
			ctx.filename = (ctx.filename || 'image').replace(/\.[^.]+$/, '') + '.webp';
		},
	],
});
```

You can also reroute storage (`ctx.bucket = 's3-archive'`), force a path
(`ctx.path = 'avatars'`), or set `ctx.visibility = 'private'`.

## Linking & Logging

`afterMediaUpload` / `afterMediaDelete` are where you persist relationships or audit
trails — e.g. a media-manager plugin recording which user/entity owns a file, or the
logging plugin writing an audit row:

```typescript
panel.registerMediaHooks({
	afterMediaUpload: [
		async (ctx: MediaHookContext) => {
			await db.media.insert({
				key: ctx.result!.key,
				bucket: ctx.result!.bucket,
				userId: ctx.user?.id,
				resource: ctx.resourceSlug,
				recordId: ctx.recordId,
			});
		},
	],
	afterMediaDelete: [async (ctx: MediaHookContext) => db.media.deleteByKey(ctx.key)],
});
```

## Multiple Hooks

Multiple plugins can register handlers for the same event — the arrays are concatenated
and run **in registration order**, so each handler sees the previous one's mutations:

```typescript
panel.registerMediaHooks({
	beforeMediaUpload: [
		async (ctx: MediaHookContext) => {
			ctx.path = 'uploads'; // first: force a folder
		},
		async (ctx: MediaHookContext) => {
			ctx.filename = `${Date.now()}-${ctx.filename}`; // second: prefix a timestamp
		},
	],
});
```

## Error Handling

If a `before*` hook (or the storage adapter) throws, the upload/delete is aborted and the
request returns `500`. Your `onMediaError` hooks run **exactly once** with `ctx.error`
set — useful for auditing failures — and never rethrow:

```typescript
panel.registerMediaHooks({
	beforeMediaUpload: [
		async (ctx: MediaHookContext) => {
			if ((ctx.file?.length ?? 0) > 10 * 1024 * 1024) {
				throw new Error('File exceeds 10MB');
			}
		},
	],
	onMediaError: [
		async (ctx: MediaHookContext) => {
			console.error(`[media.${ctx.operation}] failed:`, ctx.error?.message);
		},
	],
});
```

> To **reject** an upload with a proper `403` (rather than a `500`), use the authorization
> hooks instead — see [Authorization & Hooks](/media/overview#authorization-hooks).
