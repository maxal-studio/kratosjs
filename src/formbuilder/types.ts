// Core type definitions for the form builder system

// Utility types

export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Form context passed to resolvable functions
 */
export interface FormContext {
	get: (field: string) => any;
	operation?: 'create' | 'edit' | 'view';
}

/**
 * Resolvable type - can be a static value, a function with no args, or a function with context
 * The context includes 'get' function for accessing form state and 'operation' for create/edit/view
 */
export type Resolvable<T> = T | (() => T) | ((context: FormContext) => T);

// Validation rule types

/** Stored/serialized rule shape (what travels over the wire). */
export type ValidationRule = string | object;

export interface ValidationRules {
	rules: ValidationRule[];
	messages: Record<string, string>;
	attributes: Record<string, string>;
}

/**
 * Registry of known (parameterless) validation-rule names, used to give
 * `.rules([...])` autocomplete and typo-checking.
 *
 * ⚠️ These types are the *authoring surface* only — they do NOT define rule
 * behaviour. The actual rules live in `src/validation/rules.ts` (the shared
 * engine). When you add a rule there, mirror its name here so it autocompletes:
 *   • parameterless rule (e.g. 'slug')     → add `slug: true;` below
 *   • parameterized rule (e.g. 'between:n') → add a template literal to `ParameterizedRule`
 * Forgetting this is not fatal (the `string & {}` escape hatch in
 * `ValidationRuleInput` still accepts it at runtime) — you just lose
 * autocomplete and typo-checking for that rule.
 *
 * Plugins make their custom rules first-class by augmenting this interface:
 *
 * ```ts
 * declare module '@maxal_studio/kratosjs' {
 *   interface KratosValidationRules { phone: true }
 * }
 * ```
 */
export interface KratosValidationRules {
	required: true;
	email: true;
	url: true;
	integer: true;
	numeric: true;
	alpha: true;
	alpha_num: true;
	alpha_dash: true;
	uuid: true;
	json: true;
	confirmed: true;
}

/** A known parameterless rule name (`'required'`, `'email'`, …). */
export type ValidationRuleName = keyof KratosValidationRules & string;

/**
 * Known rules that take a `:param` suffix, typed via template literals.
 * Mirror any parameterized rule added to `src/validation/rules.ts` here.
 */
export type ParameterizedRule =
	| `min:${number}`
	| `max:${number}`
	| `min_value:${number}`
	| `max_value:${number}`
	| `regex:${string}`
	| `same:${string}`
	| `confirmed:${string}`;

/**
 * Authoring-surface type for `.rule()` / `.rules([...])`. Yields autocomplete
 * for every known and plugin-registered rule plus template-literal hints for
 * parameterized rules, while still accepting any string (e.g. a plugin's
 * parameterized rule) via the `string & {}` escape hatch — so this is purely
 * additive and never rejects a rule the engine can actually run.
 */
export type ValidationRuleInput = ValidationRuleName | ParameterizedRule | (string & {});

// Component serialization
export interface SerializedComponent {
	type: string;
	name: string;
	/** Nested child components (declarative children contract). */
	schema?: SerializedComponent[];
	/** True for pure layout containers that hold no value of their own. */
	isLayout?: boolean;
	/** 'inherit' = children share parent value scope; 'array' = item template (Repeater). */
	childScope?: 'inherit' | 'array';
	[key: string]: unknown;
}

export interface SerializedForm {
	type: 'form';
	components: SerializedComponent[];
	columns?: number | Record<string, number>;
	actions?: any[]; // Actions from table schema (for ViewModal)
	canCreate?: boolean;
	canEdit?: boolean;
	canDelete?: boolean;
	canView?: boolean;
}
