// The single, isomorphic validation engine.
//
// Both the backend (`SchemaValidator`) and the frontend (`useValidation`) call
// `ValidationEngine.validateValue(...)` with the same rule strings and get the
// same verdicts and messages. Plugins extend it via `register(...)`.

import { RuleDefinition, RuleViolation, ValidateValueOptions } from './types';
import { builtInRules, kindOf, isEmpty } from './rules';

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
			const message =
				override ??
				(typeof result === 'string'
					? result
					: def.message
						? def.message(ctx)
						: `Field "${opts.label || opts.field}" is invalid`);

			violations.push({ field: opts.field, rule: name, message });
		}

		return violations;
	}
}

/** Process-wide singleton engine, seeded with the built-in rules. */
export const ValidationEngine = new ValidationEngineImpl();

export type { ValidationEngineImpl };
