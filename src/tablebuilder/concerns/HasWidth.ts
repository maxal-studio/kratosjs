import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds width control to a column
 */
export function HasWidth<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasWidth> {
	return class extends Base {
		public _width?: Resolvable<string | number>;

		width(width: Resolvable<string | number>): this {
			this._width = width;
			return this;
		}

		getWidth(): string | number | undefined {
			if (typeof this._width === 'function') {
				return (this._width as () => string | number)();
			}
			return this._width;
		}
	};
}

export interface HasWidth {
	width(width: Resolvable<string | number>): this;
	getWidth(): string | number | undefined;
}
