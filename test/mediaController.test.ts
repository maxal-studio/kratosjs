import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MediaController } from '../src/panel/controllers/MediaController';
import { PanelHooks } from '../src/panel/PanelHooks';

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

/** Build a panel double with the surface MediaController consumes. */
function makePanel(adapter = makeAdapter()) {
	const hooks = new PanelHooks();
	const panel: any = {
		hooks,
		media: {
			getAdapter: vi.fn(() => adapter),
			getOrCreateDefaultAdapter: vi.fn(() => adapter),
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

	describe('lifecycle notification hooks', () => {
		it('fires mediaUploaded with the result and a rich context', async () => {
			const mediaUploaded = vi.fn();
			hooks.mediaUploaded = mediaUploaded;
			const req: any = {
				body: { file: base64, filename: 'a.png', fieldName: 'cover', recordId: '42' },
				panelResource: makeResource(),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleUpload(req, res);

			expect(mediaUploaded).toHaveBeenCalledOnce();
			const [result, ctx] = mediaUploaded.mock.calls[0];
			expect(result).toMatchObject({ key: 'uploads/file.png' });
			expect(ctx).toMatchObject({
				operation: 'upload',
				resourceSlug: 'posts',
				fieldName: 'cover',
				recordId: '42',
				user: { id: 'u1' },
			});
		});

		it('fires mediaDeleted with the resolved key after deletion', async () => {
			const mediaDeleted = vi.fn();
			hooks.mediaDeleted = mediaDeleted;
			const req: any = {
				body: { key: { key: 'uploads/file.png', bucket: 's3' }, fieldName: 'cover' },
				panelResource: makeResource(),
				authUser: { id: 'u1' },
			};
			const res = makeRes();

			await controller.handleDelete(req, res);

			expect(adapter.delete).toHaveBeenCalledWith('uploads/file.png');
			expect(mediaDeleted).toHaveBeenCalledOnce();
			expect(mediaDeleted.mock.calls[0][0]).toMatchObject({
				operation: 'delete',
				key: 'uploads/file.png',
				bucket: 's3',
				fieldName: 'cover',
			});
		});
	});
});
