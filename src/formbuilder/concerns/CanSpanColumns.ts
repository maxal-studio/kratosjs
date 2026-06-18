import { Resolvable, Constructor } from '../types';

/**
 * Mixin for column spanning
 */
export function CanSpanColumns<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanSpanColumns> {
	return class extends Base {
		public _columnSpan: Record<string, Resolvable<number | string>> | null = null;
		public _columnStart: Record<string, Resolvable<number>> | null = null;

		/**
		 * Set the column span for this component
		 * @param span - number, 'full', or object with breakpoints
		 */
		columnSpan(span: number | string | Record<string, number | string>): this {
			if (typeof span === 'number' || typeof span === 'string') {
				this._columnSpan = {
					default: 1,
					lg: span,
				};
			} else {
				this._columnSpan = {
					default: 1,
					...span,
				};
			}
			return this;
		}

		/**
		 * Make the component span the full width
		 */
		columnSpanFull(): this {
			this._columnSpan = {
				default: 'full',
			};
			return this;
		}

		/**
		 * Set which column to start at
		 * @param start - number or object with breakpoints
		 */
		columnStart(start: number | Record<string, number>): this {
			if (typeof start === 'number') {
				this._columnStart = {
					lg: start,
				};
			} else {
				this._columnStart = start;
			}
			return this;
		}

		getColumnSpan(): Record<string, number | string> | null {
			if (!this._columnSpan) return null;

			const evaluated: Record<string, number | string> = {};
			for (const key in this._columnSpan) {
				evaluated[key] = (this as any).evaluate(this._columnSpan[key]);
			}
			return evaluated;
		}

		getColumnStart(): Record<string, number> | null {
			if (!this._columnStart) return null;

			const evaluated: Record<string, number> = {};
			for (const key in this._columnStart) {
				evaluated[key] = (this as any).evaluate(this._columnStart[key]);
			}
			return evaluated;
		}
	};
}

export interface CanSpanColumns {
	columnSpan(span: number | string | Record<string, number | string>): this;
	columnSpanFull(): this;
	columnStart(start: number | Record<string, number>): this;
	getColumnSpan(): Record<string, number | string> | null;
	getColumnStart(): Record<string, number> | null;
}
