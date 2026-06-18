import { describe, expect, it } from 'vitest';
import { ValidationEngine } from '../src';

// The engine is the single source of truth shared by backend and frontend.
// These tests pin its behavior so neither side can drift from it.

function isValid(value: any, rules: string[], allValues: Record<string, any> = {}): boolean {
	return ValidationEngine.validateValue(value, rules, { field: 'f', allValues }).length === 0;
}

describe('ValidationEngine.parseRule', () => {
	it('splits on the first colon only', () => {
		expect(ValidationEngine.parseRule('required')).toEqual({ name: 'required' });
		expect(ValidationEngine.parseRule('min:5')).toEqual({ name: 'min', param: '5' });
		expect(ValidationEngine.parseRule('regex:^a:b$')).toEqual({ name: 'regex', param: '^a:b$' });
	});
});

describe('ValidationEngine built-in rules', () => {
	it('required runs even on empty values', () => {
		expect(isValid('', ['required'])).toBe(false);
		expect(isValid(null, ['required'])).toBe(false);
		expect(isValid([], ['required'])).toBe(false);
		expect(isValid('x', ['required'])).toBe(true);
		expect(isValid(0, ['required'])).toBe(true);
		expect(isValid(false, ['required'])).toBe(true);
	});

	it('non-required rules skip empty values', () => {
		// Absent value should not trip email/min — presence is required's job.
		expect(isValid('', ['email', 'min:3'])).toBe(true);
		expect(isValid(undefined, ['alpha'])).toBe(true);
	});

	it('email / url', () => {
		expect(isValid('a@b.com', ['email'])).toBe(true);
		expect(isValid('nope', ['email'])).toBe(false);
		expect(isValid('https://x.com', ['url'])).toBe(true);
		expect(isValid('not a url', ['url'])).toBe(false);
	});

	it('integer / numeric', () => {
		expect(isValid('42', ['integer'])).toBe(true);
		expect(isValid('4.2', ['integer'])).toBe(false);
		expect(isValid(7, ['integer'])).toBe(true);
		expect(isValid('4.2', ['numeric'])).toBe(true);
		expect(isValid('abc', ['numeric'])).toBe(false);
	});

	it('alpha / alpha_num / alpha_dash', () => {
		expect(isValid('abc', ['alpha'])).toBe(true);
		expect(isValid('ab1', ['alpha'])).toBe(false);
		expect(isValid('ab1', ['alpha_num'])).toBe(true);
		expect(isValid('a-b_1', ['alpha_dash'])).toBe(true);
		expect(isValid('a b', ['alpha_dash'])).toBe(false);
	});

	it('uuid / json', () => {
		expect(isValid('123e4567-e89b-12d3-a456-426614174000', ['uuid'])).toBe(true);
		expect(isValid('nope', ['uuid'])).toBe(false);
		expect(isValid('{"a":1}', ['json'])).toBe(true);
		expect(isValid('{bad', ['json'])).toBe(false);
	});

	it('min / max are value-kind aware', () => {
		// strings → length
		expect(isValid('ab', ['min:3'])).toBe(false);
		expect(isValid('abc', ['min:3'])).toBe(true);
		expect(isValid('abcd', ['max:3'])).toBe(false);
		// numbers → value
		expect(isValid(2, ['min:3'])).toBe(false);
		expect(isValid(5, ['min:3'])).toBe(true);
		expect(isValid(5, ['max:3'])).toBe(false);
		// arrays → length
		expect(isValid([1], ['min:2'])).toBe(false);
		expect(isValid([1, 2], ['min:2'])).toBe(true);
	});

	it('min_value / max_value coerce strings', () => {
		expect(isValid('2', ['min_value:3'])).toBe(false);
		expect(isValid('4', ['min_value:3'])).toBe(true);
		expect(isValid('4', ['max_value:3'])).toBe(false);
	});

	it('regex (param may contain colons)', () => {
		expect(isValid('ab:cd', ['regex:^[a-z:]+$'])).toBe(true);
		expect(isValid('AB', ['regex:^[a-z]+$'])).toBe(false);
	});

	it('same / confirmed cross-field', () => {
		expect(isValid('x', ['same:pw'], { pw: 'x' })).toBe(true);
		expect(isValid('x', ['same:pw'], { pw: 'y' })).toBe(false);
		// confirmed with no param targets <field>_confirmation
		expect(
			ValidationEngine.validateValue('x', ['confirmed'], { field: 'pw', allValues: { pw_confirmation: 'x' } }),
		).toHaveLength(0);
		expect(
			ValidationEngine.validateValue('x', ['confirmed'], { field: 'pw', allValues: { pw_confirmation: 'y' } }),
		).toHaveLength(1);
	});

	it('reports the violated rule name and message', () => {
		const [v] = ValidationEngine.validateValue('nope', ['email'], { field: 'mail' });
		expect(v.rule).toBe('email');
		expect(v.field).toBe('mail');
		expect(v.message).toMatch(/valid email/);
	});

	it('honors per-rule message overrides', () => {
		const [v] = ValidationEngine.validateValue('nope', ['email'], {
			field: 'mail',
			messages: { email: 'Bad email!' },
		});
		expect(v.message).toBe('Bad email!');
	});

	it('skips inapplicable rules by value kind', () => {
		// email only applies to strings — a boolean is skipped, not failed.
		expect(isValid(true, ['email'])).toBe(true);
	});

	it('ignores unknown rules (lenient)', () => {
		expect(isValid('x', ['totally_made_up'])).toBe(true);
	});
});

describe('ValidationEngine plugin registration', () => {
	it('supports custom rules', () => {
		ValidationEngine.register({
			name: 'even_length',
			appliesTo: ['string'],
			validate: ({ value }) => String(value).length % 2 === 0,
			message: ({ field }) => `${field} must have even length`,
		});
		expect(isValid('abcd', ['even_length'])).toBe(true);
		expect(isValid('abc', ['even_length'])).toBe(false);
	});
});
