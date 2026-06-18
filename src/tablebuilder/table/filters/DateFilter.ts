import { Filter } from './Filter';
import { SerializedFilter } from '../../types';

/**
 * DateFilter for date range filtering (from/to)
 */
export class DateFilter extends Filter {
	protected _placeholder?: string;
	protected _displayFormat?: string;

	/**
	 * Set placeholder text
	 */
	placeholder(placeholder: string): this {
		this._placeholder = placeholder;
		return this;
	}

	/**
	 * Set display format for dates
	 */
	displayFormat(format: string): this {
		this._displayFormat = format;
		return this;
	}

	getPlaceholder(): string | undefined {
		return this._placeholder;
	}

	getDisplayFormat(): string | undefined {
		return this._displayFormat;
	}

	toJSON(): SerializedFilter {
		return {
			...super.toJSON(),
			type: 'date',
			placeholder: this._placeholder,
			displayFormat: this._displayFormat,
		};
	}

	static make(name: string): DateFilter {
		return new DateFilter(name);
	}
}
