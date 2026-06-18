import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';
import { CanBeLengthConstrained } from '../../concerns/CanBeLengthConstrained';
import { HasPlaceholder } from '../../concerns/HasPlaceholder';
import { CanBeReadOnly } from '../../concerns/CanBeReadOnly';
import { CanRenderHtml } from '../../concerns/CanRenderHtml';

/**
 * TextInput component
 */
class BaseTextInput extends Field {
	protected componentType: string = 'text-input';
	protected _type?: string;
	protected _inputMode?: string;
	protected _minValue?: number | Resolvable<number>;
	protected _maxValue?: number | Resolvable<number>;
	protected _step?: number | string;
	protected _mask?: string;

	// Type modifiers
	email(condition: Resolvable<boolean> = true): this {
		const shouldApply = this.evaluate(condition);
		if (shouldApply) {
			this._type = 'email';
			super.email(); // Add email validation
		}
		return this;
	}

	numeric(condition: Resolvable<boolean> = true): this {
		const shouldApply = this.evaluate(condition);
		if (shouldApply) {
			this._type = 'number';
			super.numeric(); // Add numeric validation
		}
		return this;
	}

	password(condition: Resolvable<boolean> = true): this {
		const shouldApply = this.evaluate(condition);
		if (shouldApply) {
			this._type = 'password';
		}
		return this;
	}

	tel(condition: Resolvable<boolean> = true): this {
		const shouldApply = this.evaluate(condition);
		if (shouldApply) {
			this._type = 'tel';
		}
		return this;
	}

	url(condition: Resolvable<boolean> = true): this {
		const shouldApply = this.evaluate(condition);
		if (shouldApply) {
			this._type = 'url';
			super.url(); // Add url validation
		}
		return this;
	}

	type(type: string): this {
		this._type = type;
		return this;
	}

	// Input properties
	inputMode(mode: string): this {
		this._inputMode = mode;
		return this;
	}

	minValue(value: number | Resolvable<number>): this {
		this._minValue = value;
		// Add numeric min value validation rule
		const rule =
			typeof value === 'function' ? () => `min_value:${(value as () => number)()}` : `min_value:${value}`;
		(this as any).rule?.(rule);
		return this;
	}

	maxValue(value: number | Resolvable<number>): this {
		this._maxValue = value;
		// Add numeric max value validation rule
		const rule =
			typeof value === 'function' ? () => `max_value:${(value as () => number)()}` : `max_value:${value}`;
		(this as any).rule?.(rule);
		return this;
	}

	step(step: number | string): this {
		this._step = step;
		return this;
	}

	mask(mask: string): this {
		this._mask = mask;
		return this;
	}

	getType(): string {
		return this._type || 'text';
	}

	getInputMode(): string | undefined {
		return this._inputMode;
	}

	getMinValue(): number | undefined {
		return this._minValue ? this.evaluate(this._minValue) : undefined;
	}

	getMaxValue(): number | undefined {
		return this._maxValue ? this.evaluate(this._maxValue) : undefined;
	}

	getStep(): number | string | undefined {
		return this._step;
	}

	getMask(): string | undefined {
		return this._mask;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();

		json.type = 'text-input';
		json.inputType = this.getType();

		const placeholder = (this as any).getPlaceholder?.();
		if (placeholder) {
			json.placeholder = placeholder;
		}

		if ((this as any).isReadOnly?.()) {
			json.readOnly = true;
		}

		const minLength = (this as any).getMinLength?.();
		if (minLength !== undefined) {
			json.minLength = minLength;
		}

		const maxLength = (this as any).getMaxLength?.();
		if (maxLength !== undefined) {
			json.maxLength = maxLength;
		}

		const minValue = this.getMinValue();
		if (minValue !== undefined) {
			json.minValue = minValue;
		}

		const maxValue = this.getMaxValue();
		if (maxValue !== undefined) {
			json.maxValue = maxValue;
		}

		if (this._inputMode) {
			json.inputMode = this._inputMode;
		}

		if (this._step !== undefined) {
			json.step = this._step;
		}

		if (this._mask) {
			json.mask = this._mask;
		}

		if ((this as any).isRenderHtml?.()) {
			json.renderHtml = true;
		}

		return json;
	}
}

// Apply mixins
const TextInputWithMixins = CanRenderHtml(CanBeReadOnly(HasPlaceholder(CanBeLengthConstrained(BaseTextInput))));

export class TextInput extends TextInputWithMixins {
	static make(name: string): TextInput {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
