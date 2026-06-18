import { Constructor } from '../types';

export type DateFormat = 'date' | 'dateTime' | 'time' | 'since' | 'until';

/**
 * Mixin that adds date formatting functionality
 * Available only on TextColumn
 */
export function CanFormatDate<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanFormatDate> {
	return class extends Base {
		public _dateFormat?: DateFormat;
		public _dateFormatString?: string;

		/**
		 * Format as date (e.g., "12/31/2023")
		 */
		date(format?: string): this {
			this._dateFormat = 'date';
			this._dateFormatString = format;
			return this;
		}

		/**
		 * Format as date and time (e.g., "12/31/2023, 10:30 AM")
		 */
		dateTime(format?: string): this {
			this._dateFormat = 'dateTime';
			this._dateFormatString = format;
			return this;
		}

		/**
		 * Format as time only (e.g., "10:30 AM")
		 */
		time(format?: string): this {
			this._dateFormat = 'time';
			this._dateFormatString = format;
			return this;
		}

		/**
		 * Format as relative time in the past (e.g., "2 hours ago")
		 */
		since(): this {
			this._dateFormat = 'since';
			return this;
		}

		/**
		 * Format as relative time in the future (e.g., "in 3 days")
		 */
		until(): this {
			this._dateFormat = 'until';
			return this;
		}

		getDateFormat(): DateFormat | undefined {
			return this._dateFormat;
		}

		getDateFormatString(): string | undefined {
			return this._dateFormatString;
		}
	};
}

export interface CanFormatDate {
	date(format?: string): this;
	dateTime(format?: string): this;
	time(format?: string): this;
	since(): this;
	until(): this;
	getDateFormat(): DateFormat | undefined;
	getDateFormatString(): string | undefined;
}
