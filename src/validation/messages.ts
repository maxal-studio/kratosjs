// Default English validation messages, as i18n catalog entries.
//
// Pure and browser-safe (no imports) so it can be spread into BOTH the server
// `core` catalog (`src/i18n/locales/core/en.ts`) and the React client `core`
// catalog. Built-in rules emit a `messageKey` (default `validation.<name>`) plus
// `params` (`{ label, param }`); these templates render those via i18next/ICU.
//
// `{label}` is the field's human label; `{param}` is the rule argument
// (e.g. `5` in `min:5`, `name` in `same:name`).

export const defaultValidationMessages: Record<string, string> = {
	// Presence / format.
	'validation.required': 'Field "{label}" is required',
	'validation.email': 'Field "{label}" must be a valid email',
	'validation.url': 'Field "{label}" must be a valid URL',
	'validation.integer': 'Field "{label}" must be a whole number',
	'validation.numeric': 'Field "{label}" must be numeric',
	'validation.alpha': 'Field "{label}" may only contain letters',
	'validation.alpha_num': 'Field "{label}" may only contain letters and numbers',
	'validation.alpha_dash': 'Field "{label}" may only contain letters, numbers, dashes and underscores',
	'validation.uuid': 'Field "{label}" must be a valid UUID',
	'validation.json': 'Field "{label}" must be valid JSON',
	'validation.regex': 'Field "{label}" does not match the required pattern',

	// Size — string length vs numeric value.
	'validation.min.string': 'Field "{label}" must be at least {param} characters',
	'validation.max.string': 'Field "{label}" must be at most {param} characters',
	'validation.min.number': 'Field "{label}" must be at least {param}',
	'validation.max.number': 'Field "{label}" must be at most {param}',
	'validation.min_value': 'Field "{label}" must be at least {param}',
	'validation.max_value': 'Field "{label}" must be at most {param}',

	// Relational.
	'validation.same': 'Field "{label}" must match {param}',
	'validation.confirmed': 'Field "{label}" confirmation does not match',

	// Generic fallback + type errors (thrown by SchemaValidator, bypassing rules).
	'validation.invalid': 'Field "{label}" is invalid',
	'validation.type.string': 'Field "{label}" must be a string',
	'validation.type.number': 'Field "{label}" must be a number',
	'validation.type.boolean': 'Field "{label}" must be a boolean',
	'validation.type.array': 'Field "{label}" must be an array',
	'validation.type.array_items': 'Field "{label}" must be an array of strings or numbers',
	'validation.type.object': 'Field "{label}" must be an object',
	'validation.type.date': 'Field "{label}" must be a valid date',
	'validation.readonly': 'Field "{label}" is read-only',
	'validation.invalid_option': 'Field "{label}" has an invalid option',
};

/**
 * Render a default English validation message for a `messageKey` + params,
 * without an i18n engine. Used for `Error.message` (logs, test matchers) and as a
 * last-resort fallback. Simple `{token}` interpolation only.
 */
export function formatValidationMessage(messageKey: string, params: Record<string, unknown> = {}): string {
	const template = defaultValidationMessages[messageKey] ?? defaultValidationMessages['validation.invalid'];
	return template.replace(/\{(\w+)\}/g, (_, token: string) =>
		params[token] !== undefined ? String(params[token]) : `{${token}}`,
	);
}
