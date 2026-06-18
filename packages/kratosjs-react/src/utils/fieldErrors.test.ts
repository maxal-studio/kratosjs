import { describe, expect, it } from 'vitest';
import type { FieldErrors } from 'react-hook-form';
import { getFieldError } from './fieldErrors';

describe('getFieldError', () => {
	it('resolves a flat field error', () => {
		const errors = { email: { type: 'required', message: 'Required' } } as unknown as FieldErrors;
		expect(getFieldError(errors, 'email')?.message).toBe('Required');
	});

	it('resolves a nested array (repeater row) error by dotted path', () => {
		const errors = {
			items: [{ name: { type: 'required', message: 'Row name required' } }],
		} as unknown as FieldErrors;
		expect(getFieldError(errors, 'items.0.name')?.message).toBe('Row name required');
		expect(getFieldError(errors, 'items[0].name')?.message).toBe('Row name required');
	});

	it('returns undefined for a missing path', () => {
		const errors = { items: [{ name: { type: 'min', message: 'x' } }] } as unknown as FieldErrors;
		expect(getFieldError(errors, 'items.1.name')).toBeUndefined();
		expect(getFieldError(errors, 'missing')).toBeUndefined();
	});

	it('does not treat a container node (array/object) as a field error', () => {
		const errors = { items: [{ name: { type: 'required', message: 'x' } }] } as unknown as FieldErrors;
		// `items` itself is the array container, not a leaf field error
		expect(getFieldError(errors, 'items')).toBeUndefined();
	});

	it('is safe with undefined inputs', () => {
		expect(getFieldError(undefined, 'a')).toBeUndefined();
		expect(getFieldError({} as FieldErrors, undefined)).toBeUndefined();
	});
});
