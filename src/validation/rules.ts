// Built-in validation rule definitions.
//
// These consolidate the union of everything the two former implementations
// (backend `SchemaValidator` switch + frontend `useValidation` chain) did, so
// nothing is lost and both sides now behave identically.

import { RuleDefinition, ValueKind } from './types';

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
// When you EDIT a rule, the user-facing text is NOT defined here: a rule emits a
// `messageKey` (default `validation.<name>`) + `params` (default `{ label, param }`),
// and the actual strings live in the i18n catalogs (`src/validation/messages.ts`
// for English, plus each locale). Add a `messageKey` only when it differs from the
// default (see `min`/`max`). `appliesTo` controls which value kinds the rule runs
// against (omit ⇒ any; e.g. 'string' skips it for booleans/numbers).
// Add a case to `test/validationEngine.test.ts` for any new/changed behaviour.
// ─────────────────────────────────────────────────────────────────────────────
export const builtInRules: RuleDefinition[] = [
	{
		name: 'required',
		runOnEmpty: true,
		validate: ctx => !isEmpty(ctx.value),
	},
	{
		name: 'email',
		appliesTo: ['string'],
		validate: ctx => EMAIL_RE.test(String(ctx.value)),
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
	},
	{
		name: 'integer',
		validate: ctx => {
			if (typeof ctx.value === 'number') return Number.isInteger(ctx.value);
			return INTEGER_RE.test(String(ctx.value));
		},
	},
	{
		name: 'numeric',
		validate: ctx => {
			if (typeof ctx.value === 'number') return !isNaN(ctx.value);
			return NUMERIC_RE.test(String(ctx.value)) && !isNaN(Number(ctx.value));
		},
	},
	{
		name: 'alpha',
		appliesTo: ['string'],
		validate: ctx => ALPHA_RE.test(String(ctx.value)),
	},
	{
		name: 'alpha_num',
		appliesTo: ['string'],
		validate: ctx => ALPHA_NUM_RE.test(String(ctx.value)),
	},
	{
		name: 'alpha_dash',
		appliesTo: ['string'],
		validate: ctx => ALPHA_DASH_RE.test(String(ctx.value)),
	},
	{
		name: 'uuid',
		appliesTo: ['string'],
		validate: ctx => UUID_RE.test(String(ctx.value)),
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
		messageKey: ctx => (typeof ctx.value === 'number' ? 'validation.min.number' : 'validation.min.string'),
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
		messageKey: ctx => (typeof ctx.value === 'number' ? 'validation.max.number' : 'validation.max.string'),
	},
	{
		// Explicit numeric-value aliases (kept for back-compat with `.minValue()`).
		name: 'min_value',
		validate: ctx => {
			const n = parseFloat(ctx.param as string);
			if (isNaN(n)) return true;
			return toNumber(ctx.value) >= n;
		},
	},
	{
		name: 'max_value',
		validate: ctx => {
			const n = parseFloat(ctx.param as string);
			if (isNaN(n)) return true;
			return toNumber(ctx.value) <= n;
		},
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
	},
	{
		name: 'same',
		validate: ctx => (ctx.param ? ctx.value === ctx.allValues[ctx.param] : true),
	},
	{
		// `confirmed` with no param defaults to `<field>_confirmation` (Laravel convention).
		name: 'confirmed',
		validate: ctx => {
			const target = ctx.param || `${ctx.field}_confirmation`;
			return ctx.value === ctx.allValues[target];
		},
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
	},
];
