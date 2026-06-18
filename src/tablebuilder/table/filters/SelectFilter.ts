import { Filter } from './Filter';
import { SerializedFilter } from '../../types';

/**
 * SelectFilter for dropdown filtering
 */
export class SelectFilter extends Filter {
	protected _options: Record<string, string> = {};
	protected _placeholder?: string;
	protected _multiple: boolean = false;

	/**
	 * Set filter options
	 */
	options(options: Record<string, string>): this {
		this._options = options;
		return this;
	}

	/**
	 * Set placeholder text
	 */
	placeholder(placeholder: string): this {
		this._placeholder = placeholder;
		return this;
	}

	/**
	 * Allow multiple selections
	 */
	multiple(condition: boolean = true): this {
		this._multiple = condition;
		return this;
	}

	getOptions(): Record<string, string> {
		return this._options;
	}

	getPlaceholder(): string | undefined {
		return this._placeholder;
	}

	isMultiple(): boolean {
		return this._multiple;
	}

	toJSON(): SerializedFilter {
		return {
			...super.toJSON(),
			type: 'select',
			options: this._options,
			placeholder: this._placeholder,
			multiple: this._multiple,
		};
	}

	static make(name: string): SelectFilter {
		return new SelectFilter(name);
	}
}
