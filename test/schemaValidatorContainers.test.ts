import { describe, expect, it } from 'vitest';
import { FormBuilder, TextInput, Group, Section, Tabs, Repeater, SchemaValidator } from '../src';
import { ValidationError } from '../src/resource/types';

// Validation must reach fields nested in container components — both layout
// containers (Section/Group/Tabs, which share the parent value scope) and
// array-scope containers (Repeater, whose item fields validate per element).

function create(schema: any, data: any): { ok: boolean; rule?: string; field?: string } {
	try {
		SchemaValidator.validateCreate(schema, data);
		return { ok: true };
	} catch (e) {
		if (e instanceof ValidationError) return { ok: false, rule: e.rule, field: e.field };
		throw e;
	}
}

describe('SchemaValidator — layout containers (shared value scope)', () => {
	it('Group: enforces rules on nested fields', () => {
		const schema = FormBuilder.make()
			.schema([Group.make('g').schema([TextInput.make('email').label('Email').required().email()])])
			.toJSON();
		expect(create(schema, {}).rule).toBe('required');
		expect(create(schema, { email: 'nope' }).rule).toBe('email');
		expect(create(schema, { email: 'a@b.com' }).ok).toBe(true);
	});

	it('Section: enforces rules on nested fields', () => {
		const schema = FormBuilder.make()
			.schema([Section.make('s').schema([TextInput.make('code').label('Code').alpha()])])
			.toJSON();
		expect(create(schema, { code: 'ab1' }).rule).toBe('alpha');
		expect(create(schema, { code: 'abc' }).ok).toBe(true);
	});

	it('Tabs > Tab: reaches deeply nested fields', () => {
		const schema = FormBuilder.make()
			.schema([
				Tabs.make('t').tabs([
					{ label: 'A', schema: [TextInput.make('title').label('Title').required().min(3)] },
				]),
			])
			.toJSON();
		expect(create(schema, {}).rule).toBe('required');
		expect(create(schema, { title: 'ab' }).rule).toBe('min');
		expect(create(schema, { title: 'abc' }).ok).toBe(true);
	});

	it('mixed nesting (Group inside Tab)', () => {
		const schema = FormBuilder.make()
			.schema([
				Tabs.make('t').tabs([
					{ label: 'A', schema: [Group.make('g').schema([TextInput.make('email').label('Email').email()])] },
				]),
			])
			.toJSON();
		expect(create(schema, { email: 'bad' }).rule).toBe('email');
	});
});

describe('SchemaValidator — Repeater (array-scope, per-item validation)', () => {
	const schema = FormBuilder.make()
		.schema([
			Repeater.make('items').schema([
				TextInput.make('name').label('Name').required().min(3),
				TextInput.make('code').label('Code').alpha(),
			]),
		])
		.toJSON();

	it('enforces required on an item field', () => {
		expect(create(schema, { items: [{}] }).rule).toBe('required');
	});

	it('enforces other rules on item fields', () => {
		expect(create(schema, { items: [{ name: 'ab' }] }).rule).toBe('min');
		expect(create(schema, { items: [{ name: 'abc', code: 'a1' }] }).rule).toBe('alpha');
	});

	it('validates every row, not just the first', () => {
		expect(create(schema, { items: [{ name: 'abc', code: 'abc' }, { name: 'x' }] }).rule).toBe('min');
	});

	it('accepts fully valid rows', () => {
		expect(create(schema, { items: [{ name: 'abc', code: 'abc' }, { name: 'defg' }] }).ok).toBe(true);
	});

	it('validates fields in containers nested inside a repeater', () => {
		const nested = FormBuilder.make()
			.schema([
				Repeater.make('rows').schema([
					Group.make('g').schema([TextInput.make('email').label('Email').email()]),
				]),
			])
			.toJSON();
		expect(create(nested, { rows: [{ email: 'nope' }] }).rule).toBe('email');
		expect(create(nested, { rows: [{ email: 'a@b.com' }] }).ok).toBe(true);
	});

	it('on update, required is relaxed but other item rules still apply', () => {
		expect(() => SchemaValidator.validateUpdate(schema, { items: [{}] })).not.toThrow();
		expect(() => SchemaValidator.validateUpdate(schema, { items: [{ name: 'ab' }] })).toThrow(/at least 3/);
	});
});
