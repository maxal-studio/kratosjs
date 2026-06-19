import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Panel } from '../src';
import { MediaController } from '../src/panel/controllers/MediaController';
import { PanelHooks, MediaHooks, MediaHookContext } from '../src/panel/PanelHooks';
import { mergeMediaHooks } from '../src/utils/panelHelpers';

/** Minimal response double capturing status + json. */
function makeRes() {
	const res: any = {};
	res.statusCode = 200;
	res.body = undefined;
	res.status = vi.fn((code: number) => {
		res.statusCode = code;
		return res;
	});
	res.json = vi.fn((payload: any) => {
		res.body = payload;
		return res;
	});
	return res;
}

/** Fake media adapter recording upload/delete calls. */
function makeAdapter() {
	return {
		upload: vi.fn(async () => ({ key: 'uploads/file.png', url: 'http://x/uploads/file.png' })),
		delete: vi.fn(async () => undefined),
	};
}

/** Build a panel double with the surface MediaController consumes, including a
 *  real array-based media-hook engine (register + execute mirror the Panel). */
function makePanel(adapter = makeAdapter()) {
	const hooks = new PanelHooks();
	let mediaHooks: MediaHooks = {};
	const panel: any = {
		hooks,
		media: {
			getAdapter: vi.fn(() => adapter),
			getOrCreateDefaultAdapter: vi.fn(() => adapter),
		},
		registerMediaHooks(next: MediaHooks) {
			mediaHooks = mergeMediaHooks(mediaHooks, next);
			return panel;
		},
		async executeMediaHooks(event: keyof MediaHooks, ctx: MediaHookContext) {
			for (const handler of mediaHooks[event] || []) {
				await handler(ctx);
			}
		},
	};
	return { panel, hooks, adapter };
}

/** A resource double whose capability flags can be toggled per test. */
function makeResource(caps: { create?: boolean; edit?: boolean; del?: boolean; view?: boolean } = {}) {
	const { create = true, edit = true, del = true, view = true } = caps;
	return {
		resourceClass: {
			getCanCreate: () => create,
			getCanEdit: () => edit,
			getCanDelete: () => del,
			getCanView: () => view,
			getSlug: () => 'posts',
		},
	};
}

const base64 = Buffer.from('hello').toString('base64');

describe('MediaController authorization', () => {
	let adapter: ReturnType<typeof makeAdapter>;
	let panel: any;
	let hooks: PanelHooks;
	let controller: MediaController;

	beforeEach(() => {
		({ panel, hooks, adapter } = makePanel());
		controller = new MediaController(panel);
	});

	describe('per-resource upload', () => {
		it('allows upload when the user has write access', async () => {
			const req: any = {
				body: { file: base64, filename: 'a.png' },
				panelResource: makeResource(),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(res.statusCode).toBe(200);
			expect(adapter.upload).toHaveBeenCalledOnce();
		});

		it('returns 403 when the user lacks both create and edit', async () => {
			const req: any = {
				body: { file: base64 },
				panelResource: makeResource({ create: false, edit: false }),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(res.statusCode).toBe(403);
			expect(adapter.upload).not.toHaveBeenCalled();
		});

		it('allows upload for an editor who cannot create', async () => {
			const req: any = {
				body: { file: base64 },
				panelResource: makeResource({ create: false, edit: true }),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(res.statusCode).toBe(200);
		});
	});

	describe('per-resource delete', () => {
		it('allows delete (image replace during edit) for an editor lacking record-delete', async () => {
			const req: any = {
				body: { key: 'uploads/file.png' },
				panelResource: makeResource({ edit: true, del: false }),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleDelete(req, res);

			expect(res.statusCode).toBe(200);
			expect(adapter.delete).toHaveBeenCalledWith('uploads/file.png');
		});

		it('returns 403 when the user has no write access', async () => {
			const req: any = {
				body: { key: 'uploads/file.png' },
				panelResource: makeResource({ create: false, edit: false }),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleDelete(req, res);

			expect(res.statusCode).toBe(403);
			expect(adapter.delete).not.toHaveBeenCalled();
		});
	});

	describe('media access-check hooks', () => {
		it('blocks an upload when mediaUploadAccessCheck returns false', async () => {
			hooks.mediaUploadAccessCheck = vi.fn(async () => false);
			const req: any = { body: { file: base64 }, authUser: { id: 'u1' } }; // global route, no resource
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(res.statusCode).toBe(403);
			expect(adapter.upload).not.toHaveBeenCalled();
		});

		it('guards arbitrary-key deletion via mediaDeleteAccessCheck', async () => {
			hooks.mediaDeleteAccessCheck = vi.fn(async () => false);
			const req: any = { body: { key: 'someone-elses/file.png' }, authUser: { id: 'u1' } };
			const res = makeRes();

			await controller.handleDelete(req, res);

			expect(res.statusCode).toBe(403);
			expect(hooks.mediaDeleteAccessCheck).toHaveBeenCalledOnce();
			expect(adapter.delete).not.toHaveBeenCalled();
		});
	});

	describe('lifecycle hooks', () => {
		it('fires afterMediaUpload with ctx.result and a rich context', async () => {
			const afterMediaUpload = vi.fn();
			panel.registerMediaHooks({ afterMediaUpload: [afterMediaUpload] });
			const req: any = {
				body: { file: base64, filename: 'a.png', fieldName: 'cover', recordId: '42' },
				panelResource: makeResource(),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(afterMediaUpload).toHaveBeenCalledOnce();
			const ctx = afterMediaUpload.mock.calls[0][0];
			expect(ctx.result).toMatchObject({ key: 'uploads/file.png' });
			expect(ctx).toMatchObject({
				operation: 'upload',
				resourceSlug: 'posts',
				fieldName: 'cover',
				recordId: '42',
				user: { id: 'u1' },
			});
		});

		it('fires afterMediaDelete with the resolved key after deletion', async () => {
			const afterMediaDelete = vi.fn();
			panel.registerMediaHooks({ afterMediaDelete: [afterMediaDelete] });
			const req: any = {
				body: { key: { key: 'uploads/file.png', bucket: 's3' }, fieldName: 'cover' },
				panelResource: makeResource(),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleDelete(req, res);

			expect(adapter.delete).toHaveBeenCalledWith('uploads/file.png');
			expect(afterMediaDelete).toHaveBeenCalledOnce();
			expect(afterMediaDelete.mock.calls[0][0]).toMatchObject({
				operation: 'delete',
				key: 'uploads/file.png',
				bucket: 's3',
				fieldName: 'cover',
			});
		});

		it('lets beforeMediaUpload transform the buffer and rename the file', async () => {
			panel.registerMediaHooks({
				beforeMediaUpload: [
					(ctx: MediaHookContext) => {
						ctx.file = Buffer.from('compressed');
						ctx.filename = 'renamed.png';
						ctx.path = 'optimized';
					},
				],
			});
			const req: any = {
				body: { file: base64, filename: 'original.png' },
				panelResource: makeResource(),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(res.statusCode).toBe(200);
			const [buffer, options] = adapter.upload.mock.calls[0];
			expect(buffer.toString()).toBe('compressed');
			expect(options).toMatchObject({ filename: 'renamed.png', path: 'optimized' });
		});

		it('runs stacked beforeMediaUpload handlers in registration order', async () => {
			const order: string[] = [];
			panel.registerMediaHooks({
				beforeMediaUpload: [
					(ctx: MediaHookContext) => {
						order.push('first');
						ctx.filename = 'a';
					},
				],
			});
			panel.registerMediaHooks({
				beforeMediaUpload: [
					(ctx: MediaHookContext) => {
						order.push('second');
						ctx.filename = `${ctx.filename}b`; // sees first hook's mutation
					},
				],
			});
			const req: any = { body: { file: base64 }, panelResource: makeResource(), authUser: { id: 'u1' } };
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(order).toEqual(['first', 'second']);
			expect(adapter.upload.mock.calls[0][1]).toMatchObject({ filename: 'ab' });
		});

		it('runs onMediaError (with ctx.error) and returns 500 when the adapter throws', async () => {
			adapter.upload.mockRejectedValueOnce(new Error('disk full'));
			const onMediaError = vi.fn();
			panel.registerMediaHooks({ onMediaError: [onMediaError] });
			const req: any = { body: { file: base64 }, panelResource: makeResource(), authUser: { id: 'u1' } };
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(res.statusCode).toBe(500);
			expect(onMediaError).toHaveBeenCalledOnce();
			expect(onMediaError.mock.calls[0][0].error).toBeInstanceOf(Error);
			expect(onMediaError.mock.calls[0][0].error.message).toBe('disk full');
		});
	});
});

describe('Panel.deleteMediaFiles (backend cascade deletion)', () => {
	it('fires before/after media delete hooks with server-trusted context', async () => {
		const panel = Panel.make('test-media-cascade');
		const order: string[] = [];
		const seen: MediaHookContext[] = [];
		panel.registerMediaHooks({
			beforeMediaDelete: [
				(ctx: MediaHookContext) => {
					order.push('before');
					seen.push({ ...ctx });
				},
			],
			afterMediaDelete: [() => void order.push('after')],
		});

		// No media adapters registered → the actual unlink no-ops, but hooks must still fire.
		await panel.deleteMediaFiles([{ key: 'uploads/old.png', bucket: 'local' }], {
			user: { id: 'u1' } as any,
			resourceSlug: 'posts',
			recordId: '42',
		});

		expect(order).toEqual(['before', 'after']);
		expect(seen[0]).toMatchObject({
			operation: 'delete',
			key: 'uploads/old.png',
			bucket: 'local',
			resourceSlug: 'posts',
			recordId: '42',
			user: { id: 'u1' },
		});
	});

	it('runs hooks once per file', async () => {
		const panel = Panel.make('test-media-cascade-multi');
		const keys: string[] = [];
		panel.registerMediaHooks({ afterMediaDelete: [(ctx: MediaHookContext) => void keys.push(ctx.key!)] });

		await panel.deleteMediaFiles([
			{ key: 'a.png', bucket: 'local' },
			{ key: 'b.png', bucket: 'local' },
		]);

		expect(keys).toEqual(['a.png', 'b.png']);
	});
});
