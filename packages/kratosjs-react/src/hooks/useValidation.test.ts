import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useValidation } from './useValidation';

// The hook no longer re-implements rule semantics: it delegates to the shared
// ValidationEngine via a single RHF `validate` function. These tests confirm
// the wiring (required → native RHF, everything else → engine) and that the
// verdicts match the engine the backend also uses.

function wrapper({ children }: { children: React.ReactNode }) {
	function Inner() {
		const methods = useForm();
		return React.createElement(FormProvider, methods as any, children);
	}
	return React.createElement(Inner);
}

function runValidate(result: ReturnType<typeof useValidation>, value: any, formValues: Record<string, any> = {}) {
	return result.validate?.kratos(value, formValues);
}

describe('useValidation', () => {
	it('maps required to RHF native (drives the asterisk)', () => {
		const { result } = renderHook(() => useValidation(['required'], 'create', 'name'), { wrapper });
		expect(result.current.required).toBe('This field is required');
	});

	it('delegates email validation to the engine', () => {
		const { result } = renderHook(() => useValidation(['email'], 'create', 'email'), { wrapper });
		expect(runValidate(result.current, 'a@b.com')).toBe(true);
		expect(runValidate(result.current, 'nope')).toMatch(/valid email/);
	});

	it('delegates min length to the engine', () => {
		const { result } = renderHook(() => useValidation(['min:3'], 'create', 'title'), { wrapper });
		expect(runValidate(result.current, 'abc')).toBe(true);
		expect(runValidate(result.current, 'ab')).toMatch(/at least 3 characters/);
	});

	it('enforces alpha (parity with the backend)', () => {
		const { result } = renderHook(() => useValidation(['alpha'], 'create', 'code'), { wrapper });
		expect(runValidate(result.current, 'abc')).toBe(true);
		expect(runValidate(result.current, 'ab1')).toMatch(/letters/);
	});

	it('resolves cross-field rules against form values', () => {
		const { result } = renderHook(() => useValidation(['same:password'], 'create', 'confirm'), { wrapper });
		expect(runValidate(result.current, 'x', { password: 'x' })).toBe(true);
		expect(runValidate(result.current, 'x', { password: 'y' })).toMatch(/must match password/);
	});

	it('skips rules whose condition is false', () => {
		const rules = [{ rule: 'required', condition: false }];
		const { result } = renderHook(() => useValidation(rules, 'create', 'name'), { wrapper });
		expect(result.current.required).toBeUndefined();
	});
});
