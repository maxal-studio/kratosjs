import { describe, expect, it } from 'vitest';
import { ValidationEngine } from '../src/validation/ValidationEngine';
import { SchemaValidator } from '../src/validators/SchemaValidator';
import { ValidationError } from '../src/resource/types';
import type { SerializedForm } from '../src/formbuilder/types';

// Phase 4 — rules emit structured { messageKey, params } alongside a rendered
// English message, so the client can localize and the server stays correct.

function firstViolation(value: any, rules: string[], opts: any = {}) {
	return ValidationEngine.validateValue(value, rules, { field: 'email', label: 'Email', ...opts })[0];
}

describe('ValidationEngine structured violations', () => {
	it('emits a default messageKey (validation.<rule>) + params', () => {
		const v = firstViolation('', ['required']);
		expect(v).toMatchObject({
			rule: 'required',
			messageKey: 'validation.required',
			params: { label: 'Email' },
		});
		// Rendered English is still present (logs / non-i18n consumers).
		expect(v.message).toBe('Field "Email" is required');
	});

	it('picks a kind-specific key for min (string vs number)', () => {
		expect(firstViolation('ab', ['min:3']).messageKey).toBe('validation.min.string');
		expect(firstViolation(2, ['min:3']).messageKey).toBe('validation.min.number');
		expect(firstViolation('ab', ['min:3']).params).toMatchObject({ label: 'Email', param: '3' });
	});

	it('carries the rule param for relational rules', () => {
		const v = firstViolation('x', ['same:password'], { allValues: { password: 'y' } });
		expect(v).toMatchObject({ rule: 'same', messageKey: 'validation.same', params: { param: 'password' } });
	});

	it('a per-field override is a final literal with no messageKey', () => {
		const v = firstViolation('nope', ['email'], { messages: { email: 'Bad email!' } });
		expect(v.message).toBe('Bad email!');
		expect(v.messageKey).toBeUndefined();
	});
});

describe('SchemaValidator throws structured ValidationError', () => {
	const schema: SerializedForm = {
		components: [
			{ type: 'textinput', name: 'email', label: 'Email', validation: { rules: [{ rule: 'required' }] } } as any,
		],
	} as any;

	it('rule violation carries messageKey + params', () => {
		try {
			SchemaValidator.validateCreate(schema, {});
			throw new Error('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ValidationError);
			const err = e as ValidationError;
			expect(err.rule).toBe('required');
			expect(err.messageKey).toBe('validation.required');
			expect(err.params).toMatchObject({ label: 'Email' });
			expect(err.message).toBe('Field "Email" is required');
		}
	});

	it('type mismatch carries a validation.type.* key', () => {
		const typeSchema: SerializedForm = {
			components: [{ type: 'toggle', name: 'active', label: 'Active' } as any],
		} as any;
		try {
			SchemaValidator.validateCreate(typeSchema, { active: 'yes' });
			throw new Error('should have thrown');
		} catch (e) {
			const err = e as ValidationError;
			expect(err.messageKey).toBe('validation.type.boolean');
			expect(err.rule).toBe('type');
			expect(err.params).toMatchObject({ label: 'Active' });
		}
	});
});
