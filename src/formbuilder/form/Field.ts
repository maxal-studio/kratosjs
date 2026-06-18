import { Component } from '../Component';
import { SerializedComponent } from '../types';
import { CanBeValidated } from '../concerns/CanBeValidated';
import { HasHelperText } from '../concerns/HasHelperText';
import { HasHint } from '../concerns/HasHint';
import { CanBeAutofocused } from '../concerns/CanBeAutofocused';
import { CanSpanColumns } from '../concerns/CanSpanColumns';
import { HasAfterStateUpdated } from '../concerns/HasAfterStateUpdated';
import { makeConfigurable } from '../../utils/configurable';

/**
 * Formatter function type for fields
 * Receives the field value and the entire record data
 * Returns the formatted value (can be any type - string, number, etc.)
 * Can be async to allow for backend operations
 */
export type FieldFormatterFn = (value: any, record: Record<string, any>) => any | Promise<any>;

/**
 * Base Field class for form inputs
 */
class BaseField extends Component {
	protected componentType: string = 'field';
	protected _formatter?: FieldFormatterFn;

	toJSON(): SerializedComponent {
		const json = super.toJSON();

		// Add validation rules with their conditions
		const self = this as any;
		const rulesWithConditions = self._rules || [];
		if (rulesWithConditions && rulesWithConditions.length > 0) {
			const validation: any = {
				rules: rulesWithConditions.map(([rule, condition]: [any, any]) => {
					// Serialize the rule
					const serializedRule = typeof rule === 'function' ? rule() : rule;

					// Serialize the condition function if it's a function
					const serializedCondition = typeof condition === 'function' ? condition.toString() : condition;

					return {
						rule: serializedRule,
						condition: serializedCondition,
					};
				}),
				messages: self.getValidationMessages?.() || {},
				attributes: {},
			};

			// Add validation attribute if present
			const validationAttribute = self.getValidationAttribute?.();
			if (validationAttribute) {
				validation.attributes = { [json.name]: validationAttribute };
			}

			json.validation = validation;
		}

		// Add helper text
		const helperText = (this as any).getHelperText?.();
		if (helperText) {
			json.helperText = helperText;
		}

		// Add hint
		const hint = (this as any).getHint?.();
		if (hint) {
			json.hint = hint;
		}

		const hintIcon = (this as any).getHintIcon?.();
		if (hintIcon) {
			json.hintIcon = hintIcon;
		}

		const hintColor = (this as any).getHintColor?.();
		if (hintColor) {
			json.hintColor = hintColor;
		}

		// Add autofocus
		if ((this as any).isAutofocused?.()) {
			json.autofocus = true;
		}

		// Add column span
		const columnSpan = self.getColumnSpan?.();
		if (columnSpan) {
			json.columnSpan = columnSpan;
		}

		// Add column start
		const columnStart = self.getColumnStart?.();
		if (columnStart) {
			json.columnStart = columnStart;
		}

		// Add afterStateUpdated callback
		const afterStateUpdatedCallback = self.getAfterStateUpdatedCallback?.();
		if (afterStateUpdatedCallback && typeof afterStateUpdatedCallback === 'function') {
			json.afterStateUpdatedFn = afterStateUpdatedCallback.toString();
		}

		return json;
	}

	/**
	 * Set a formatter function to transform the field value
	 * @param fn Function that receives (value, record) and returns the formatted value
	 * @example
	 * // Prepend URL to image path
	 * .formatStateUsing((value) => `https://cdn.example.com/${value}`)
	 *
	 * // Access nested property
	 * .formatStateUsing((value) => value?.key || '')
	 *
	 * // Use record data
	 * .formatStateUsing((value, record) => `${record.firstName} ${record.lastName}`)
	 */
	formatStateUsing(fn: FieldFormatterFn): this {
		this._formatter = fn;
		return this;
	}

	/**
	 * Get the formatter function
	 */
	getFormatter(): FieldFormatterFn | undefined {
		return this._formatter;
	}

	/**
	 * Check if field has a formatter
	 */
	hasFormatter(): boolean {
		return this._formatter !== undefined;
	}
}

// Apply field-specific mixins
const FieldWithMixins = HasAfterStateUpdated(
	CanSpanColumns(CanBeAutofocused(HasHint(HasHelperText(CanBeValidated(BaseField))))),
);

export class Field extends FieldWithMixins {
	static make(name: string): Field {
		const instance = new this(name);
		instance.configure();
		return instance;
	}

	// ── Global configuration (Filament-style `configureUsing`) ──────────────
	private static _configurator = makeConfigurable<Field>();

	/**
	 * Register a callback that mutates every field in the panel (all field types).
	 * Applied during global configuration, before serialization.
	 */
	static configureUsing(cb: (field: Field) => void): typeof Field {
		Field._configurator.register(cb);
		return Field;
	}

	/** Apply all registered global configuration callbacks to a field. */
	static applyConfiguration(field: Field): void {
		Field._configurator.apply(field);
	}

	/** Remove all registered global configuration callbacks. */
	static clearConfigurations(): void {
		Field._configurator.clear();
	}
}
