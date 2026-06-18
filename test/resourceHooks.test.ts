import { describe, expect, it, vi } from 'vitest';
import { Resource } from '../src/Resource';
import { FormBuilder, TextInput } from '../src';
import type { DataAdapter } from '../src/adapters/database/DataAdapter';
import type { HookContext, ResourceHooks } from '../src/resource/types';

/** Minimal in-memory adapter — only the methods exercised by these tests do work. */
function makeAdapter(overrides: Partial<DataAdapter> = {}): DataAdapter {
	const base: Partial<DataAdapter> = {
		create: async (data: any) => ({ id: 1, ...data }),
		findById: async (id: any) => ({ id, name: 'existing' }),
		findByIds: async (ids: any[]) => ids.map(id => ({ id })),
		update: async (id: any, data: any) => ({ id, ...data }),
		delete: async (ids: any[]) => ({ deleted: ids.map(id => ({ id })) }),
		list: async () => ({ data: [{ id: 1 }], pagination: {} as any }),
		listRelated: async () => ({ data: [{ id: 2 }], pagination: {} as any }),
		buildFiltersQuery: async () => ({}),
	};
	return { ...base, ...overrides } as unknown as DataAdapter;
}

function makeResource(hooks: ResourceHooks, adapter: DataAdapter = makeAdapter()): Resource {
	return new Resource({
		adapter,
		formSchema: undefined as any,
		tableSchema: undefined as any,
		hooks,
		resourceClass: class {} as any,
	});
}

describe('Resource hook pipeline', () => {
	it('runs onError exactly once when a before hook throws', async () => {
		const onError = vi.fn();
		const resource = makeResource({
			beforeCreate: [
				async () => {
					throw new Error('boom');
				},
			],
			onError: [async (ctx: HookContext) => onError(ctx.error?.message)],
		});

		await expect(resource.create({ name: 'x' })).rejects.toThrow('boom');
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith('boom');
	});

	it('runs onError exactly once when the adapter throws', async () => {
		const onError = vi.fn();
		const adapter = makeAdapter({
			create: async () => {
				throw new Error('db down');
			},
		});
		const resource = makeResource({ onError: [async () => onError()] }, adapter);

		await expect(resource.create({ name: 'x' })).rejects.toThrow('db down');
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it('fires beforeAction/afterAction and returns the handler result', async () => {
		const order: string[] = [];
		const resource = makeResource({
			beforeAction: [
				async (ctx: HookContext) => {
					order.push(`before:${ctx.action?.name}`);
				},
			],
			afterAction: [
				async (ctx: HookContext) => {
					order.push(`after:${ctx.output.action?.message}`);
				},
			],
		});

		const result = await resource.runAction('publish', async () => ({ success: true, message: 'done' }), {
			records: [{ id: 7 }],
			formData: { note: 'hi' },
		});

		expect(result).toEqual({ success: true, message: 'done' });
		expect(order).toEqual(['before:publish', 'after:done']);
	});

	it('runs onError once when an action handler throws', async () => {
		const onError = vi.fn();
		const resource = makeResource({ onError: [async (ctx: HookContext) => onError(ctx.operation)] });

		await expect(
			resource.runAction(
				'explode',
				async () => {
					throw new Error('handler boom');
				},
				{ records: [] },
			),
		).rejects.toThrow('handler boom');
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith('action');
	});

	it('listRelated uses its own hooks and operation, not the list hooks', async () => {
		const afterList = vi.fn();
		const afterListRelated = vi.fn();
		const resource = makeResource({
			afterList: [async () => afterList()],
			afterListRelated: [async (ctx: HookContext) => afterListRelated(ctx.operation)],
		});

		await resource.listRelated({ parentId: 1, relation: {} as any });

		expect(afterList).not.toHaveBeenCalled();
		expect(afterListRelated).toHaveBeenCalledTimes(1);
		expect(afterListRelated).toHaveBeenCalledWith('listRelated');
	});
});

describe('validation runs between before* hooks and afterValidate', () => {
	const formSchema = FormBuilder.make()
		.schema([TextInput.make('password').label('Password').required().min(8).max(50)])
		.toJSON();

	function makeFormResource(hooks: ResourceHooks): Resource {
		return new Resource({
			adapter: makeAdapter(),
			formSchema: formSchema as any,
			tableSchema: undefined as any,
			hooks,
			resourceClass: class {} as any,
		});
	}

	// This is the password-hashing scenario: hashing must happen AFTER validation,
	// so a length rule checks the raw input — not the longer transformed value.
	it('afterValidate may transform a field beyond a max rule (validation saw the raw value)', async () => {
		const longHash = 'x'.repeat(60); // e.g. a bcrypt hash, well over max:50
		const resource = makeFormResource({
			afterValidate: [
				async (ctx: HookContext) => {
					const data = ctx.input.data?.[0];
					if (data?.password) data.password = longHash;
				},
			],
		});

		const result = await resource.create({ password: 'secret12' });
		expect(result.data.password).toBe(longHash);
	});

	it('a before hook that lengthens a field past max DOES fail validation (runs before it)', async () => {
		const resource = makeFormResource({
			beforeCreate: [
				async (ctx: HookContext) => {
					const data = ctx.input.data?.[0];
					if (data) data.password = 'x'.repeat(60);
				},
			],
		});

		await expect(resource.create({ password: 'secret12' })).rejects.toThrow(/at most 50/);
	});
});
