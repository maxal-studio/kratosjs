import { describe, expect, it } from 'vitest';
import { TextInput, TextColumn } from '../src';

/**
 * Behavioural guard for the self-typing mixin refactor: long fluent chains that
 * cross several concerns must keep returning the same instance and serialize
 * correctly. (The companion `builderMixinTypes` test guards the *type* side.)
 */
describe('mixin method chaining', () => {
	it('chains formbuilder concern methods returning the same Field instance', () => {
		const field = TextInput.make('email');

		const result = field
			.required()
			.email()
			.columnSpan(2)
			.helperText('We never share it')
			.hint('Work address')
			.autofocus()
			.afterStateUpdated(() => {});

		// Every chainable concern method returns `this`.
		expect(result).toBe(field);

		const json = field.toJSON();
		expect(json.name).toBe('email');
		expect(json.validation).toBeDefined();
		expect(json.helperText).toBe('We never share it');
		expect(json.hint).toBe('Work address');
		expect(json.autofocus).toBe(true);
		expect(json.columnSpan).toBeDefined();
		expect(typeof json.afterStateUpdatedFn).toBe('string');
	});

	it('chains tablebuilder concern methods returning the same Column instance', () => {
		const column = TextColumn.make('createdAt');

		const result = column.sortable().searchable().wrap().color('primary').weight('bold').date().gridSpanFull();

		expect(result).toBe(column);

		const json = column.toJSON();
		expect(json.name).toBe('createdAt');
		expect(json.sortable).toBe(true);
		expect(json.color).toBe('primary');
		expect(json.gridSpanFull).toBe(true);
	});

	it('keeps separate instances independent', () => {
		const a = TextInput.make('a').required();
		const b = TextInput.make('b');

		expect(a.toJSON().validation).toBeDefined();
		expect(b.toJSON().validation).toBeUndefined();
	});
});
