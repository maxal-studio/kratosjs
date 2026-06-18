import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';

/**
 * DateTimePicker component
 */
export class DateTimePicker extends Field {
	protected componentType: string = 'date-time-picker';
	protected _format?: string;
	protected _displayFormat?: string;
	protected _timezone?: string;
	protected _isNative: Resolvable<boolean> = false;
	protected _minDate?: string | Date;
	protected _maxDate?: string | Date;
	protected _firstDayOfWeek?: number;

	/**
	 * Set the format string for the date/time picker
	 * @param format - Format string (e.g., 'YYYY-MM-DD', 'HH:mm', 'YYYY-MM-DD HH:mm')
	 *
	 * Common formats:
	 * - Date only: 'YYYY-MM-DD', 'DD/MM/YYYY'
	 * - Time only: 'HH:mm', 'HH:mm:ss'
	 * - Date and time: 'YYYY-MM-DD HH:mm', 'DD/MM/YYYY HH:mm:ss'
	 */
	format(format: string): this {
		this._format = format;
		return this;
	}

	displayFormat(format: string): this {
		this._displayFormat = format;
		return this;
	}

	timezone(timezone: string): this {
		this._timezone = timezone;
		return this;
	}

	native(condition: Resolvable<boolean> = true): this {
		this._isNative = condition;
		return this;
	}

	minDate(date: string | Date): this {
		this._minDate = date;
		return this;
	}

	maxDate(date: string | Date): this {
		this._maxDate = date;
		return this;
	}

	firstDayOfWeek(day: number): this {
		this._firstDayOfWeek = day;
		return this;
	}

	isNative(): boolean {
		return this.evaluate(this._isNative);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'date-time-picker';

		if (this._format) {
			json.format = this._format;
		}

		if (this._displayFormat) {
			json.displayFormat = this._displayFormat;
		}

		if (this._timezone) {
			json.timezone = this._timezone;
		}

		if (this.isNative()) {
			json.native = true;
		}

		if (this._minDate) {
			json.minDate = this._minDate instanceof Date ? this._minDate.toISOString() : this._minDate;
		}

		if (this._maxDate) {
			json.maxDate = this._maxDate instanceof Date ? this._maxDate.toISOString() : this._maxDate;
		}

		if (this._firstDayOfWeek !== undefined) {
			json.firstDayOfWeek = this._firstDayOfWeek;
		}

		return json;
	}

	static make(name: string): DateTimePicker {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
