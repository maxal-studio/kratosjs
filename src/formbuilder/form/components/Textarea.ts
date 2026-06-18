import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';
import { CanBeLengthConstrained } from '../../concerns/CanBeLengthConstrained';
import { HasPlaceholder } from '../../concerns/HasPlaceholder';
import { CanBeReadOnly } from '../../concerns/CanBeReadOnly';
import { CanRenderHtml } from '../../concerns/CanRenderHtml';

/**
 * Textarea component
 */
class BaseTextarea extends Field {
	protected componentType: string = 'textarea';
	protected _rows?: number | Resolvable<number>;
	protected _cols?: number | Resolvable<number>;
	protected _isAutosize: Resolvable<boolean> = false;

	rows(rows: number | Resolvable<number>): this {
		this._rows = rows;
		return this;
	}

	cols(cols: number | Resolvable<number>): this {
		this._cols = cols;
		return this;
	}

	autosize(condition: Resolvable<boolean> = true): this {
		this._isAutosize = condition;
		return this;
	}

	getRows(): number | undefined {
		return this._rows ? this.evaluate(this._rows) : undefined;
	}

	getCols(): number | undefined {
		return this._cols ? this.evaluate(this._cols) : undefined;
	}

	isAutosize(): boolean {
		return this.evaluate(this._isAutosize);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'textarea';

		const rows = this.getRows();
		if (rows !== undefined) {
			json.rows = rows;
		}

		const cols = this.getCols();
		if (cols !== undefined) {
			json.cols = cols;
		}

		if (this.isAutosize()) {
			json.autosize = true;
		}

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

		if ((this as any).isRenderHtml?.()) {
			json.renderHtml = true;
		}

		return json;
	}
}

// Apply mixins
const TextareaWithMixins = CanRenderHtml(CanBeReadOnly(HasPlaceholder(CanBeLengthConstrained(BaseTextarea))));

export class Textarea extends TextareaWithMixins {
	static make(name: string): Textarea {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
