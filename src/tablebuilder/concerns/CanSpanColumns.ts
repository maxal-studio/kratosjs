import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds column spanning functionality
 */
export function CanSpanColumns<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanSpanColumns> {
	return class extends Base {
		public _columnSpan?: Resolvable<number | 'full'>;

		columnSpan(span: Resolvable<number | 'full'>): this {
			this._columnSpan = span;
			return this;
		}

		columnSpanFull(): this {
			return this.columnSpan('full');
		}

		getColumnSpan(): number | 'full' | undefined {
			if (typeof this._columnSpan === 'function') {
				return (this._columnSpan as () => number | 'full')();
			}
			return this._columnSpan;
		}
	};
}

export interface CanSpanColumns {
	columnSpan(span: Resolvable<number | 'full'>): this;
	columnSpanFull(): this;
	getColumnSpan(): number | 'full' | undefined;
}
