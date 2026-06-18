import { Constructor, Resolvable, ValidationRule, ValidationRuleInput } from '../types';

/**
 * Mixin that adds validation rules to a component
 */
export function CanBeValidated<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeValidated> {
	return class extends Base {
		public _rules: Array<[ValidationRule, Resolvable<boolean>]> = [];
		public _validationMessages: Record<string, string> = {};
		public _validationAttribute?: string;
		public _regexPattern?: string;

		// Convenience validation methods
		required(condition: Resolvable<boolean> = true): this {
			return this.rule('required', condition);
		}

		email(condition: Resolvable<boolean> = true): this {
			return this.rule('email', condition);
		}

		url(condition: Resolvable<boolean> = true): this {
			return this.rule('url', condition);
		}

		numeric(condition: Resolvable<boolean> = true): this {
			return this.rule('numeric', condition);
		}

		integer(condition: Resolvable<boolean> = true): this {
			return this.rule('integer', condition);
		}

		alpha(condition: Resolvable<boolean> = true): this {
			return this.rule('alpha', condition);
		}

		alphaDash(condition: Resolvable<boolean> = true): this {
			return this.rule('alpha_dash', condition);
		}

		alphaNum(condition: Resolvable<boolean> = true): this {
			return this.rule('alpha_num', condition);
		}

		min(value: number | Resolvable<number>, condition: Resolvable<boolean> = true): this {
			const rule = typeof value === 'function' ? () => `min:${(value as () => number)()}` : `min:${value}`;

			return this.rule(rule as any, condition);
		}

		max(value: number | Resolvable<number>, condition: Resolvable<boolean> = true): this {
			const rule = typeof value === 'function' ? () => `max:${(value as () => number)()}` : `max:${value}`;

			return this.rule(rule as any, condition);
		}

		regex(pattern: string | Resolvable<string>, condition: Resolvable<boolean> = true): this {
			const rule =
				typeof pattern === 'function' ? () => `regex:${(pattern as () => string)()}` : `regex:${pattern}`;

			return this.rule(rule as any, condition);
		}

		uuid(condition: Resolvable<boolean> = true): this {
			return this.rule('uuid', condition);
		}

		json(condition: Resolvable<boolean> = true): this {
			return this.rule('json', condition);
		}

		confirmed(condition: Resolvable<boolean> = true): this {
			return this.rule('confirmed', condition);
		}

		/**
		 * Field must match another field value
		 * @param fieldName - Name of the field to match against
		 * @param condition - Optional condition
		 */
		same(fieldName: string, condition: Resolvable<boolean> = true): this {
			return this.rule(`same:${fieldName}`, condition);
		}

		// Core validation methods
		rule(rule: ValidationRuleInput | Resolvable<ValidationRuleInput>, condition: Resolvable<boolean> = true): this {
			this._rules.push([rule as ValidationRule, condition]);
			return this;
		}

		rules(rules: ValidationRuleInput[] | string, condition: Resolvable<boolean> = true): this {
			const list = typeof rules === 'string' ? rules.split('|') : rules;

			for (const rule of list) {
				this.rule(rule, condition);
			}

			return this;
		}

		validationMessages(messages: Record<string, string>): this {
			this._validationMessages = { ...this._validationMessages, ...messages };
			return this;
		}

		validationAttribute(attribute: string): this {
			this._validationAttribute = attribute;
			return this;
		}

		getValidationRules(): ValidationRule[] {
			const rules: ValidationRule[] = [];

			for (const [rule, condition] of this._rules) {
				// Evaluate condition
				const shouldApply = this.evaluate(condition);
				if (!shouldApply) continue;

				// Evaluate rule
				const evaluatedRule = this.evaluate(rule);

				if (Array.isArray(evaluatedRule)) {
					rules.push(...evaluatedRule);
				} else {
					rules.push(evaluatedRule);
				}
			}

			return rules;
		}

		getValidationMessages(): Record<string, string> {
			return { ...this._validationMessages };
		}

		getValidationAttribute(): string | undefined {
			return this._validationAttribute;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as () => T)() : value;
		}
	};
}

export interface CanBeValidated {
	required(condition?: Resolvable<boolean>): this;
	email(condition?: Resolvable<boolean>): this;
	url(condition?: Resolvable<boolean>): this;
	numeric(condition?: Resolvable<boolean>): this;
	integer(condition?: Resolvable<boolean>): this;
	alpha(condition?: Resolvable<boolean>): this;
	alphaDash(condition?: Resolvable<boolean>): this;
	alphaNum(condition?: Resolvable<boolean>): this;
	min(value: number | Resolvable<number>, condition?: Resolvable<boolean>): this;
	max(value: number | Resolvable<number>, condition?: Resolvable<boolean>): this;
	regex(pattern: string | Resolvable<string>, condition?: Resolvable<boolean>): this;
	uuid(condition?: Resolvable<boolean>): this;
	json(condition?: Resolvable<boolean>): this;
	confirmed(condition?: Resolvable<boolean>): this;
	same(fieldName: string, condition?: Resolvable<boolean>): this;
	rule(rule: ValidationRuleInput | Resolvable<ValidationRuleInput>, condition?: Resolvable<boolean>): this;
	rules(rules: ValidationRuleInput[] | string, condition?: Resolvable<boolean>): this;
	validationMessages(messages: Record<string, string>): this;
	validationAttribute(attribute: string): this;
	getValidationRules(): ValidationRule[];
	getValidationMessages(): Record<string, string>;
	getValidationAttribute(): string | undefined;
}
