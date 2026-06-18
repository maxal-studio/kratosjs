import { describe, expect, it } from 'vitest';
import { FormBuilder, TextInput, SchemaValidator } from '../src';
import { ValidationError } from '../src/resource/types';

// Regression guard: the backend used to read rules from the wrong property and
// silently enforced almost nothing. It now delegates to the shared engine, so
// rules that were previously bypassable (integer/alpha*/same/confirmed) are
// enforced server-side and match the client.

const schema = FormBuilder.make()
	.schema([
		TextInput.make('title').label('Title').required().min(3),
		TextInput.make('code').alpha(),
		TextInput.make('slug').alphaDash(),
		TextInput.make('count').integer(),
		TextInput.make('password'),
		TextInput.make('passwordConfirm').same('password'),
	])
	.toJSON();

function create(data: any): { ok: boolean; rule?: string; field?: string } {
	try {
		SchemaValidator.validateCreate(schema, data);
		return { ok: true };
	} catch (e) {
		if (e instanceof ValidationError) return { ok: false, rule: e.rule, field: e.field };
		throw e;
	}
}

const base = { title: 'Hello', password: 'secret', passwordConfirm: 'secret' };

describe('SchemaValidator enforces declared rules server-side', () => {
	it('enforces required', () => {
		expect(create({ ...base, title: '' }).rule).toBe('required');
	});

	it('enforces min length', () => {
		expect(create({ ...base, title: 'ab' }).rule).toBe('min');
	});

	it('enforces alpha (previously bypassable)', () => {
		expect(create({ ...base, code: 'ab1' }).rule).toBe('alpha');
		expect(create({ ...base, code: 'abc' }).ok).toBe(true);
	});

	it('enforces alpha_dash (previously bypassable)', () => {
		expect(create({ ...base, slug: 'a b' }).rule).toBe('alpha_dash');
	});

	it('enforces integer (previously bypassable)', () => {
		expect(create({ ...base, count: '4.2' }).rule).toBe('integer');
		expect(create({ ...base, count: '42' }).ok).toBe(true);
	});

	it('enforces same (previously bypassable)', () => {
		expect(create({ ...base, passwordConfirm: 'different' }).rule).toBe('same');
	});

	it('accepts a fully valid payload', () => {
		expect(create({ ...base, code: 'abc', slug: 'a-b', count: '3' }).ok).toBe(true);
	});
});

describe('rules([...]) array form', () => {
	const arraySchema = FormBuilder.make()
		.schema([
			TextInput.make('title').label('Title').rules(['required', 'max:5']),
			TextInput.make('slug').rules('required|alpha_dash'), // pipe-delimited string form
		])
		.toJSON();

	it('enforces array-declared rules identically to method form', () => {
		expect(() => SchemaValidator.validateCreate(arraySchema, { title: 'toolong', slug: 'ok' })).toThrow(
			/at most 5/,
		);
		expect(() => SchemaValidator.validateCreate(arraySchema, { title: 'ok', slug: 'a b' })).toThrow(
			ValidationError,
		);
		expect(() => SchemaValidator.validateCreate(arraySchema, { title: 'ok', slug: 'a-b' })).not.toThrow();
	});
});

describe('SchemaValidator create vs update', () => {
	it('required is enforced on create but not on update', () => {
		expect(create({ password: 'x', passwordConfirm: 'x' }).rule).toBe('required'); // missing title
		expect(() => SchemaValidator.validateUpdate(schema, { code: 'abc' })).not.toThrow();
	});

	it('non-required rules still apply on update for present fields', () => {
		expect(() => SchemaValidator.validateUpdate(schema, { code: 'ab1' })).toThrow(ValidationError);
	});

	it('operation-gated required only fires on create', () => {
		const opSchema = FormBuilder.make()
			.schema([TextInput.make('pwd').required((c: any) => c?.operation === 'create')])
			.toJSON();
		expect(() => SchemaValidator.validateCreate(opSchema, {})).toThrow(ValidationError);
		expect(() => SchemaValidator.validateUpdate(opSchema, {})).not.toThrow();
	});
});
