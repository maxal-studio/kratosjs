import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds line clamping (truncation) control
 */
export function HasLineClamp<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasLineClamp> {
	return class extends Base {
		public _lineClamp?: Resolvable<number>;

		lineClamp(lines: Resolvable<number>): this {
			this._lineClamp = lines;
			return this;
		}

		getLineClamp(): number | undefined {
			if (typeof this._lineClamp === 'function') {
				return (this._lineClamp as () => number)();
			}
			return this._lineClamp;
		}
	};
}

export interface HasLineClamp {
	lineClamp(lines: Resolvable<number>): this;
	getLineClamp(): number | undefined;
}
