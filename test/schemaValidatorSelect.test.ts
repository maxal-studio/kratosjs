import { describe, expect, it } from 'vitest';
import { FormBuilder, SelectInput, TextInput } from '../src';
import { SchemaValidator } from '../src/validators/SchemaValidator';

describe('SchemaValidator select fields', () => {
	const schema = FormBuilder.make()
		.schema([
			TextInput.make('title').label('Title'),
			SelectInput.make('category').label('Category').relationship('category', 'name', 'categories'),
		])
		.toJSON();

	it('accepts populated relation objects on update and normalizes to id', () => {
		const result = SchemaValidator.validateUpdate(schema, {
			star: 4,
			category: { id: 2, name: 'News', slug: 'news' },
		});

		expect(result.category).toBe(2);
		expect(result.star).toBeUndefined();
	});

	it('accepts numeric foreign keys on update', () => {
		const result = SchemaValidator.validateUpdate(schema, {
			category: 3,
		});

		expect(result.category).toBe(3);
	});

	it('accepts string ids on update', () => {
		const result = SchemaValidator.validateUpdate(schema, {
			category: '5',
		});

		expect(result.category).toBe('5');
	});
});
