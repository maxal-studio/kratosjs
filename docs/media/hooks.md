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

These hooks fire around each file's physical upload/delete, at storage time — before any
record exists:

- **`beforeMediaUpload`**: Before storage. Mutate `ctx.file` (the buffer), `ctx.filename`,
  `ctx.contentType`, `ctx.path`, `ctx.bucket`, or `ctx.metadata`. Throw to abort.
- **`afterMediaUpload`**: After storage. Observe `ctx.result` (`{ key, url, bucket }`) — log, link by key, etc.
- **`beforeMediaDelete`**: Before deletion. Inspect `ctx.key`. Throw to abort.
- **`afterMediaDelete`**: After deletion. Observe — remove an owner link, log, etc.
- **`onMediaError`**: Runs once when an upload/delete throws, with `ctx.error` set. Never rethrows (so an audit handler can't mask the original failure).

## Hook Context

Each hook receives one mutable `MediaHookContext`:

- **`operation`**: `'upload' | 'delete'`
- **`user`**: The authenticated user (if available)
- **`resourceSlug`**: The resource the media belongs to — `undefined` for global (non-resource) uploads
- **`fieldName`**, **`isArray`**, **`existingValue`**: Client hints about the form field the upload is for
- **`bucket`**: Target storage adapter name (mutable in `beforeMediaUpload`)
- **`file`**: _(upload)_ The file **buffer** — replace it in `beforeMediaUpload` to transform the bytes
- **`filename`**, **`contentType`**, **`path`**, **`metadata`**: _(upload)_ Storage options, all mutable in `beforeMediaUpload`
- **`key`**: _(delete)_ The storage key being deleted
- **`result`**: Populated after a successful upload — `{ key, url?, bucket? }`
- **`error`**: Set only for `onMediaError` hooks

> These hooks fire at storage time, **before any record exists**, so there is no reliable record
> id here. Associate a file with a record by its storage `key` (e.g. in an `afterMediaUpload`
> handler), or in a resource `afterCreate`/`afterUpdate` hook.

### Trust boundary

When making **authorization** decisions, mind where each field comes from:

- **Server-trusted**: `user` (from the JWT), `resourceSlug` (from the route), and `key` (the storage key on delete).
- **Client hints**: `fieldName`, `isArray`, `existingValue` arrive in the request body on the upload route and can be forged. Use them for logging/UX or to scope a transform, **not** to gate access. Verify `key` ownership in `mediaDeleteAccessCheck`.

### Backend cascade deletes

Media isn't only deleted through the delete route. When a record is **updated** (a file is removed or replaced) or **deleted**, the framework removes the now-orphaned files — and these fire your `beforeMediaDelete` / `afterMediaDelete` / `onMediaError` hooks too, with server-trusted `user` / `resourceSlug`. (The `mediaDeleteAccessCheck` is **not** re-run here — the deletion is a side effect of an already-authorized record operation.) So an `afterMediaDelete` cleanup or audit handler sees every deletion, however it was triggered.

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

You can also reroute storage (`ctx.bucket = 's3-archive'`) or force a path
(`ctx.path = 'avatars'`).

## Logging & linking

`afterMediaUpload` / `afterMediaDelete` fire for every physical upload/delete (including
global/page uploads with no record) — use them for storage-layer audit, or to track files by
their storage `key`:

```typescript
panel.registerMediaHooks({
	afterMediaUpload: [async (ctx: MediaHookContext) => db.media.track(ctx.result!.key, ctx.user?.id)],
	afterMediaDelete: [async (ctx: MediaHookContext) => db.media.untrack(ctx.key)],
});
```

To associate a file with a specific **record** (which doesn't exist yet at upload time), do it
where the record is saved — a resource [`afterCreate`/`afterUpdate`](/resources/hooks) hook has
the saved record (with its id) and the stored media field values.

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
