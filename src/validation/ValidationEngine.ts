// The single, isomorphic validation engine.
//
// Both the backend (`SchemaValidator`) and the frontend (`useValidation`) call
// `ValidationEngine.validateValue(...)` with the same rule strings and get the
// same verdicts and messages. Plugins extend it via `register(...)`.

import { RuleContext, RuleDefinition, RuleViolation, ValidateValueOptions } from './types';
import { builtInRules, kindOf, isEmpty } from './rules';
import { formatValidationMessage } from './messages';

class ValidationEngineImpl {
	private rules = new Map<string, RuleDefinition>();

	constructor() {
		for (const def of builtInRules) {
			this.rules.set(def.name, def);
		}
	}

	/** Register (or override) a rule definition. Used by core and plugins. */
	register(definition: RuleDefinition): void {
		this.rules.set(definition.name, definition);
	}

	/** Register many rules at once. */
	registerMany(definitions: Record<string, RuleDefinition> | RuleDefinition[]): void {
		const list = Array.isArray(definitions) ? definitions : Object.values(definitions);
		for (const def of list) this.register(def);
	}

	get(name: string): RuleDefinition | undefined {
		return this.rules.get(name);
	}

	has(name: string): boolean {
		return this.rules.has(name);
	}

	/** Split a Laravel-style rule string into `{ name, param }` on the first colon. */
	parseRule(ruleString: string): { name: string; param?: string } {
		const idx = ruleString.indexOf(':');
		if (idx === -1) return { name: ruleString };
		return { name: ruleString.slice(0, idx), param: ruleString.slice(idx + 1) };
	}

	/**
	 * Validate a single value against an ordered list of rule strings.
	 * Returns every violation (callers may use just the first).
	 */
	validateValue(value: any, ruleStrings: string[], opts: ValidateValueOptions): RuleViolation[] {
		const violations: RuleViolation[] = [];
		const empty = isEmpty(value);
		const valueKind = kindOf(value);

		for (const ruleString of ruleStrings) {
			if (typeof ruleString !== 'string') continue;

			const { name, param } = this.parseRule(ruleString);
			const def = this.rules.get(name);
			if (!def) continue; // unknown rule — stay lenient

			if (empty && !def.runOnEmpty) continue;

			const appliesTo = def.appliesTo ?? ['any'];
			if (!appliesTo.includes('any') && !appliesTo.includes(valueKind)) continue;

			const ctx = {
				value,
				allValues: opts.allValues ?? {},
				field: opts.field,
				label: opts.label,
				param,
			};

			const result = def.validate(ctx);
			if (result === true) continue;

			const override = opts.messages?.[name];
			let messageKey: string | undefined;
			let params: Record<string, unknown> | undefined;
			let message: string;

			if (override !== undefined) {
				// Developer-provided literal (may itself be a resolved `t('...')` string).
				message = override;
			} else if (typeof result === 'string') {
				// Inline custom message returned by `validate`.
				message = result;
			} else {
				messageKey = resolveMessageKey(def, ctx, name);
				params = def.params ? def.params(ctx) : { label: ctx.label ?? ctx.field, param: ctx.param };
				// Default English render — the client may re-render via `t(messageKey, params)`.
				message = formatValidationMessage(messageKey, params);
			}

			violations.push({ field: opts.field, rule: name, message, messageKey, params });
		}

		return violations;
	}
}

/** Resolve a rule's i18n key, defaulting to `validation.<name>`. */
function resolveMessageKey(def: RuleDefinition, ctx: RuleContext, name: string): string {
	if (typeof def.messageKey === 'function') return def.messageKey(ctx);
	return def.messageKey ?? `validation.${name}`;
}

/** Process-wide singleton engine, seeded with the built-in rules. */
export const ValidationEngine = new ValidationEngineImpl();

export type { ValidationEngineImpl };
