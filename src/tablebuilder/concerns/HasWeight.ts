import { Constructor, Resolvable } from '../types';

export type FontWeight =
	| 'thin'
	| 'extralight'
	| 'light'
	| 'normal'
	| 'medium'
	| 'semibold'
	| 'bold'
	| 'extrabold'
	| 'black';

/**
 * Mixin that adds font weight control
 */
export function HasWeight<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasWeight> {
	return class extends Base {
		public _weight?: Resolvable<FontWeight>;

		weight(weight: Resolvable<FontWeight>): this {
			this._weight = weight;
			return this;
		}

		getWeight(): FontWeight | undefined {
			if (typeof this._weight === 'function') {
				return (this._weight as () => FontWeight)();
			}
			return this._weight;
		}
	};
}

export interface HasWeight {
	weight(weight: Resolvable<FontWeight>): this;
	getWeight(): FontWeight | undefined;
}
