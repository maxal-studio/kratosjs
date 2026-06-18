import { describe, expect, it, vi } from 'vitest';
import { executeSerializedFunction } from '../runtime/serializedFunctions';

describe('executeSerializedFunction', () => {
	it('returns undefined for empty input', () => {
		expect(executeSerializedFunction(undefined)).toBeUndefined();
		expect(executeSerializedFunction('')).toBeUndefined();
	});

	it('executes arrow functions with expression bodies', () => {
		expect(executeSerializedFunction('(value) => value * 2', 5)).toBe(10);
	});

	it('executes arrow functions with block bodies', () => {
		expect(
			executeSerializedFunction('(value, record) => { return value + record.suffix; }', 'a', { suffix: 'b' }),
		).toBe('ab');
	});

	it('executes single-param arrow functions without parens', () => {
		expect(executeSerializedFunction('value => value.toUpperCase()', 'hi')).toBe('HI');
	});

	it('executes function expressions', () => {
		expect(executeSerializedFunction('function (value) { return value * 3; }', 3)).toBe(9);
	});

	it('returns the compiled function when no args are given', () => {
		const fn = executeSerializedFunction('(value) => value + 1');
		expect(typeof fn).toBe('function');
		expect(fn(1)).toBe(2);
	});

	it('strips a __name() wrapper added by TS toolchains', () => {
		const wrapped = '__name((value) => value * 2, "double")';
		expect(executeSerializedFunction(wrapped, 4)).toBe(8);
	});

	it('strips nested __name() wrappers in block bodies', () => {
		const wrapped = '__name((value) => { const inc = __name((x) => x + 1, "inc"); return inc(value); }, "outer")';
		expect(executeSerializedFunction(wrapped, 1)).toBe(2);
	});

	it('does not mangle string literals containing __name-like text', () => {
		expect(executeSerializedFunction('(value) => "__name is fine" + value', '!')).toBe('__name is fine!');
	});

	it('returns undefined when the function throws', () => {
		// The function intentionally throws; the runtime catches it, logs, and returns undefined.
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(executeSerializedFunction('(value) => { throw new Error("boom"); }', 1)).toBeUndefined();
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});

	it('handles default parameter values', () => {
		expect(executeSerializedFunction('(value, factor = 2) => value * factor', 5, 3)).toBe(15);
	});
});
