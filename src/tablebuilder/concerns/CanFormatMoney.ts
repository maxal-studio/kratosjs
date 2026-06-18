import { Constructor } from '../types';

/**
 * Mixin that adds money/currency formatting functionality
 * Available only on TextColumn
 */
export function CanFormatMoney<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanFormatMoney> {
	return class extends Base {
		public _moneyFormat?: string;

		/**
		 * Format as currency
		 * @param currency Currency code (e.g., 'USD', 'EUR', 'GBP')
		 * @param divideBy Optional divisor (e.g., 100 for cents)
		 * @example .money('USD') - formats 1234.56 as "$1,234.56"
		 */
		money(currency: string = 'USD', _divideBy?: number): this {
			this._moneyFormat = currency;
			return this;
		}

		getMoneyFormat(): string | undefined {
			return this._moneyFormat;
		}
	};
}

export interface CanFormatMoney {
	money(currency?: string, divideBy?: number): this;
	getMoneyFormat(): string | undefined;
}
