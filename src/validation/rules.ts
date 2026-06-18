// Built-in validation rule definitions.
//
// These consolidate the union of everything the two former implementations
// (backend `SchemaValidator` switch + frontend `useValidation` chain) did, so
// nothing is lost and both sides now behave identically.

import { RuleDefinition, RuleContext, ValueKind } from './types';

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const INTEGER_RE = /^-?\d+$/;
const NUMERIC_RE = /^-?\d*\.?\d+$/;
const ALPHA_RE = /^[A-Za-z]+$/;
const ALPHA_NUM_RE = /^[A-Za-z0-9]+$/;
const ALPHA_DASH_RE = /^[A-Za-z0-9_-]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Coarse runtime classification used to scope which rules apply. */
export function kindOf(value: any): ValueKind {
	if (Array.isArray(value)) return 'array';
	const t = typeof value;
	if (t === 'number') return 'number';
	if (t === 'boolean') return 'boolean';
	if (t === 'string') return 'string';
	return 'any';
}

/** True when a value is considered "empty" for validation purposes. */
export function isEmpty(value: any): boolean {
	return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

const label = (ctx: RuleContext) => ctx.label || ctx.field;
const toNumber = (v: any) => (typeof v === 'number' ? v : parseFloat(v));

// ─────────────────────────────────────────────────────────────────────────────
// ADDING OR EDITING A RULE — checklist
//
// This array is the single source of truth for rule *behaviour*: it runs on
// both the backend (`SchemaValidator`) and the frontend (`useValidation`), so
// editing a rule here updates both sides at once — never special-case a rule in
// those files.
//
// When you ADD a rule, also update the authoring TYPES so it autocompletes in
// `.rules([...])` (see `src/formbuilder/types.ts`):
//   • a parameterless rule (e.g. 'slug')      → add `slug: true;` to `KratosValidationRules`
//   • a parameterized rule  (e.g. 'between:n') → add a template literal to `ParameterizedRule`
// (Skipping this still works at runtime via the `string & {}` escape hatch, but
//  you lose autocomplete and typo-checking.)
//
// When you EDIT a rule, remember `message` is the user-facing text shown
// identically on client and server, and `appliesTo` controls which value kinds
// the rule runs against (omit ⇒ any; e.g. 'string' skips it for booleans/numbers).
// Add a case to `test/validationEngine.test.ts` for any new/changed behaviour.
// ─────────────────────────────────────────────────────────────────────────────
export const builtInRules: RuleDefinition[] = [
	{
		name: 'required',
		runOnEmpty: true,
		validate: ctx => !isEmpty(ctx.value),
		message: ctx => `Field "${label(ctx)}" is required`,
	},
	{
		name: 'email',
		appliesTo: ['string'],
		validate: ctx => EMAIL_RE.test(String(ctx.value)),
		message: ctx => `Field "${label(ctx)}" must be a valid email`,
	},
	{
		name: 'url',
		appliesTo: ['string'],
		validate: ctx => {
			try {
				new URL(String(ctx.value));
				return true;
			} catch {
				return false;
			}
		},
		message: ctx => `Field "${label(ctx)}" must be a valid URL`,
	},
	{
		name: 'integer',
		validate: ctx => {
			if (typeof ctx.value === 'number') return Number.isInteger(ctx.value);
			return INTEGER_RE.test(String(ctx.value));
		},
		message: ctx => `Field "${label(ctx)}" must be a whole number`,
	},
	{
		name: 'numeric',
		validate: ctx => {
			if (typeof ctx.value === 'number') return !isNaN(ctx.value);
			return NUMERIC_RE.test(String(ctx.value)) && !isNaN(Number(ctx.value));
		},
		message: ctx => `Field "${label(ctx)}" must be numeric`,
	},
	{
		name: 'alpha',
		appliesTo: ['string'],
		validate: ctx => ALPHA_RE.test(String(ctx.value)),
		message: ctx => `Field "${label(ctx)}" may only contain letters`,
	},
	{
		name: 'alpha_num',
		appliesTo: ['string'],
		validate: ctx => ALPHA_NUM_RE.test(String(ctx.value)),
		message: ctx => `Field "${label(ctx)}" may only contain letters and numbers`,
	},
	{
		name: 'alpha_dash',
		appliesTo: ['string'],
		validate: ctx => ALPHA_DASH_RE.test(String(ctx.value)),
		message: ctx => `Field "${label(ctx)}" may only contain letters, numbers, dashes and underscores`,
	},
	{
		name: 'uuid',
		appliesTo: ['string'],
		validate: ctx => UUID_RE.test(String(ctx.value)),
		message: ctx => `Field "${label(ctx)}" must be a valid UUID`,
	},
	{
		// `min` is value-kind aware: string ⇒ length, number ⇒ value, array ⇒ length.
		name: 'min',
		validate: ctx => {
			const n = toNumber(ctx.param);
			if (isNaN(n)) return true;
			const value = ctx.value;
			if (typeof value === 'number') return value >= n;
			if (Array.isArray(value)) return value.length >= n;
			return String(value).length >= n;
		},
		message: ctx => {
			const value = ctx.value;
			return typeof value === 'number'
				? `Field "${label(ctx)}" must be at least ${ctx.param}`
				: `Field "${label(ctx)}" must be at least ${ctx.param} characters`;
		},
	},
	{
		name: 'max',
		validate: ctx => {
			const n = toNumber(ctx.param);
			if (isNaN(n)) return true;
			const value = ctx.value;
			if (typeof value === 'number') return value <= n;
			if (Array.isArray(value)) return value.length <= n;
			return String(value).length <= n;
		},
		message: ctx => {
			const value = ctx.value;
			return typeof value === 'number'
				? `Field "${label(ctx)}" must be at most ${ctx.param}`
				: `Field "${label(ctx)}" must be at most ${ctx.param} characters`;
		},
	},
	{
		// Explicit numeric-value aliases (kept for back-compat with `.minValue()`).
		name: 'min_value',
		validate: ctx => {
			const n = parseFloat(ctx.param as string);
			if (isNaN(n)) return true;
			return toNumber(ctx.value) >= n;
		},
		message: ctx => `Field "${label(ctx)}" must be at least ${ctx.param}`,
	},
	{
		name: 'max_value',
		validate: ctx => {
			const n = parseFloat(ctx.param as string);
			if (isNaN(n)) return true;
			return toNumber(ctx.value) <= n;
		},
		message: ctx => `Field "${label(ctx)}" must be at most ${ctx.param}`,
	},
	{
		name: 'regex',
		validate: ctx => {
			if (!ctx.param) return true;
			try {
				return new RegExp(ctx.param).test(String(ctx.value));
			} catch {
				return true; // malformed pattern — don't block (matches frontend leniency)
			}
		},
		message: ctx => `Field "${label(ctx)}" does not match the required pattern`,
	},
	{
		name: 'same',
		validate: ctx => (ctx.param ? ctx.value === ctx.allValues[ctx.param] : true),
		message: ctx => `Field "${label(ctx)}" must match ${ctx.param}`,
	},
	{
		// `confirmed` with no param defaults to `<field>_confirmation` (Laravel convention).
		name: 'confirmed',
		validate: ctx => {
			const target = ctx.param || `${ctx.field}_confirmation`;
			return ctx.value === ctx.allValues[target];
		},
		message: ctx => `Field "${label(ctx)}" confirmation does not match`,
	},
	{
		name: 'json',
		appliesTo: ['string'],
		validate: ctx => {
			try {
				JSON.parse(String(ctx.value));
				return true;
			} catch {
				return false;
			}
		},
		message: ctx => `Field "${label(ctx)}" must be valid JSON`,
	},
];
