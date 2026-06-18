import { describe, expect, it, vi } from 'vitest';
import { evaluateCondition } from '../runtime/conditions';

describe('evaluateCondition', () => {
	it('returns false for undefined', () => {
		expect(evaluateCondition(undefined, {})).toBe(false);
	});

	it('returns boolean conditions as-is', () => {
		expect(evaluateCondition(true, {})).toBe(true);
		expect(evaluateCondition(false, {})).toBe(false);
	});

	it('evaluates a function string using get()', () => {
		const condition = "({ get }) => get('status') === 'draft'";
		expect(evaluateCondition(condition, { status: 'draft' })).toBe(true);
		expect(evaluateCondition(condition, { status: 'published' })).toBe(false);
	});

	it('supports dot notation in get()', () => {
		const condition = "({ get }) => get('author.name') === 'Jane'";
		expect(evaluateCondition(condition, { author: { name: 'Jane' } })).toBe(true);
		expect(evaluateCondition(condition, { author: null })).toBe(false);
	});

	it('exposes the operation to function conditions', () => {
		const condition = "({ operation }) => operation === 'edit'";
		expect(evaluateCondition(condition, {}, 'edit')).toBe(true);
		expect(evaluateCondition(condition, {}, 'create')).toBe(false);
	});

	it('returns false when the function string throws', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(evaluateCondition('({ get }) => { throw new Error("boom"); }', {})).toBe(false);
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});

	it('returns false for invalid function strings', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(evaluateCondition('this is not js (', {})).toBe(false);
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});
});

describe('evaluateCondition with structured AST', () => {
	it('evaluates simple operators', () => {
		expect(evaluateCondition({ op: 'eq', field: 'status', value: 'draft' }, { status: 'draft' })).toBe(true);
		expect(evaluateCondition({ op: 'ne', field: 'status', value: 'draft' }, { status: 'live' })).toBe(true);
		expect(evaluateCondition({ op: 'truthy', field: 'active' }, { active: 1 })).toBe(true);
		expect(evaluateCondition({ op: 'falsy', field: 'active' }, { active: 0 })).toBe(true);
		expect(evaluateCondition({ op: 'gt', field: 'age', value: 18 }, { age: 21 })).toBe(true);
		expect(evaluateCondition({ op: 'lte', field: 'age', value: 18 }, { age: 18 })).toBe(true);
	});

	it('evaluates in/nin', () => {
		expect(evaluateCondition({ op: 'in', field: 'role', value: ['admin', 'editor'] }, { role: 'admin' })).toBe(
			true,
		);
		expect(evaluateCondition({ op: 'nin', field: 'role', value: ['admin'] }, { role: 'user' })).toBe(true);
	});

	it('evaluates the operation operator', () => {
		expect(evaluateCondition({ op: 'operation', value: 'edit' }, {}, 'edit')).toBe(true);
		expect(evaluateCondition({ op: 'operation', value: 'edit' }, {}, 'create')).toBe(false);
	});

	it('supports dot-notation fields', () => {
		expect(evaluateCondition({ op: 'eq', field: 'author.name', value: 'Jane' }, { author: { name: 'Jane' } })).toBe(
			true,
		);
	});

	it('combines with all/any/not', () => {
		const cond = {
			all: [
				{ op: 'eq' as const, field: 'status', value: 'draft' },
				{
					any: [
						{ op: 'eq' as const, field: 'role', value: 'admin' },
						{ op: 'truthy' as const, field: 'owner' },
					],
				},
			],
		};
		expect(evaluateCondition(cond, { status: 'draft', role: 'admin' })).toBe(true);
		expect(evaluateCondition(cond, { status: 'draft', owner: true })).toBe(true);
		expect(evaluateCondition(cond, { status: 'live', role: 'admin' })).toBe(false);
		expect(evaluateCondition({ not: { op: 'truthy', field: 'x' } }, { x: false })).toBe(true);
	});

	it('returns false for unknown operators', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(evaluateCondition({ op: 'wat' as never, field: 'x' }, { x: 1 })).toBe(false);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
