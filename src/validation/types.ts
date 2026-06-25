// Shared validation engine — type definitions.
//
// These types describe a single, isomorphic rule engine that is imported by
// BOTH the Node backend (`SchemaValidator`) and the React frontend
// (`useValidation`). Writing the rule semantics once eliminates the historical
// drift between the two hand-written implementations.

/** Coarse runtime classification of a value, used to scope which rules apply. */
export type ValueKind = 'string' | 'number' | 'boolean' | 'array' | 'any';

/** Context passed to a rule's `validate`/`message` functions. */
export interface RuleContext {
	/** The value being validated. */
	value: any;
	/** Sibling field values in the same scope (used by `same`/`confirmed`). */
	allValues: Record<string, any>;
	/** Name of the field being validated. */
	field: string;
	/** Human label for messages; falls back to `field` when absent. */
	label?: string;
	/** Parameter after the first colon, e.g. `'5'` in `min:5`, `'name'` in `same:name`. */
	param?: string;
}

/**
 * Definition of a single validation rule. A rule is a plain object with a pure
 * `validate` function, so it can be authored once and registered on both the
 * server and the client (mirroring the dual-registration pattern used for
 * custom field components).
 */
export interface RuleDefinition {
	/** Rule identifier, e.g. `email`, `min`, `same`. */
	name: string;
	/**
	 * Value kinds this rule applies to. When the value's kind is not listed the
	 * rule is silently skipped (e.g. `email` on a boolean). Defaults to `['any']`.
	 */
	appliesTo?: ValueKind[];
	/**
	 * When true the rule runs even for empty values. Only `required` needs this;
	 * every other rule skips empty values (a field is either present-and-valid or
	 * absent, and presence is enforced separately by `required`).
	 */
	runOnEmpty?: boolean;
	/**
	 * Validate the value. Return `true` when valid, `false` to use the default
	 * message, or a `string` to use a custom (already-rendered) message.
	 */
	validate(ctx: RuleContext): boolean | string;
	/**
	 * i18n message key for this rule. Defaults to `validation.<name>`. May vary by
	 * context (e.g. `min` picks `validation.min.string` vs `validation.min.number`).
	 */
	messageKey?: string | ((ctx: RuleContext) => string);
	/**
	 * Params for interpolating the message. Defaults to `{ label, param }`
	 * (`label` is the field's human label, `param` the rule argument).
	 */
	params?(ctx: RuleContext): Record<string, unknown>;
}

/**
 * A single failed rule. Carries a rendered English `message` (always present, for
 * logs / non-i18n consumers) plus the structured `messageKey` + `params` for
 * locale-aware rendering. `messageKey` is absent when the message is an inline
 * literal (a string returned by `validate`, or a per-field override).
 */
export interface RuleViolation {
	field: string;
	rule: string;
	message: string;
	messageKey?: string;
	params?: Record<string, unknown>;
}

/** Options for a single field validation pass. */
export interface ValidateValueOptions {
	/** Sibling field values in the same scope. */
	allValues?: Record<string, any>;
	/** Field name (used in default messages and violation output). */
	field: string;
	/** Human label for messages. */
	label?: string;
	/** Per-rule message overrides, keyed by rule name (from `.validationMessages()`). */
	messages?: Record<string, string>;
}
