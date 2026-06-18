import type { FieldErrors, FieldError } from 'react-hook-form';

/**
 * Resolve a React Hook Form error by its (possibly nested) field-name path.
 *
 * RHF stores errors for nested / array fields as nested objects — e.g. a field
 * registered as `items.0.name` lives at `errors.items[0].name`, NOT at the flat
 * key `errors['items.0.name']`. Field components therefore can't find the error
 * for a Repeater row (or any dotted name) with a plain `errors[name]` lookup.
 *
 * This walks the dot/bracket path so both flat names (`email`) and nested ones
 * (`items.0.name`, `items[0].name`) resolve correctly.
 */
export function getFieldError(errors: FieldErrors | undefined, name: string | undefined): FieldError | undefined {
	if (!errors || !name) return undefined;

	const segments = name.split(/[.[\]]+/).filter(Boolean);
	let current: any = errors;
	for (const segment of segments) {
		if (current == null) return undefined;
		current = current[segment];
	}

	// A resolved node is an error only when it carries a `type`/`message`; nested
	// containers (e.g. the array node `errors.items`) are not field errors.
	return current && (current.type || current.message) ? (current as FieldError) : undefined;
}
