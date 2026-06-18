import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { CanBeSearchable } from '../../concerns/CanBeSearchable';
import { CanUpdateState } from '../../concerns/CanUpdateState';
import { HasPlaceholder } from '../../concerns/HasPlaceholder';

/**
 * TextInputColumn for inline text input editing
 */
class BaseTextInputColumn extends Column {
	protected columnType = 'textinput';
	protected _inputType: string = 'text';
	protected _rules?: string[];

	/**
	 * Set input type (text, number, email, etc.)
	 */
	type(type: string): this {
		this._inputType = type;
		return this;
	}

	/**
	 * Set validation rules
	 */
	rules(rules: string[]): this {
		this._rules = rules;
		return this;
	}

	getInputType(): string {
		return this._inputType;
	}

	getRules(): string[] | undefined {
		return this._rules;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		json.inputType = this._inputType;
		if (this._rules) {
			json.rules = this._rules;
		}

		// Add searchable
		if ((this as any).isSearchable?.()) {
			json.searchable = true;
			const searchColumns = (this as any).getSearchColumns?.();
			if (searchColumns) {
				json.searchColumns = searchColumns;
			}
		}

		// Add placeholder
		const placeholder = (this as any).getPlaceholder?.();
		if (placeholder) {
			json.placeholder = placeholder;
		}

		// Add state update callbacks
		const beforeStateUpdated = (this as any).getBeforeStateUpdated?.();
		if (beforeStateUpdated) {
			json.beforeStateUpdated = beforeStateUpdated.toString();
		}

		const afterStateUpdated = (this as any).getAfterStateUpdated?.();
		if (afterStateUpdated) {
			json.afterStateUpdated = afterStateUpdated.toString();
		}

		return json;
	}
}

const TextInputColumnWithMixins = HasPlaceholder(CanUpdateState(CanBeSearchable(BaseTextInputColumn)));

export class TextInputColumn extends TextInputColumnWithMixins {
	static make(name: string): TextInputColumn {
		const column = new TextInputColumn(name);
		column.configure();
		return column;
	}
}
