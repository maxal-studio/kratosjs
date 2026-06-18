import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds text wrapping control
 */
export function CanWrap<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanWrap> {
	return class extends Base {
		public _canWrap: Resolvable<boolean> = false;

		wrap(condition: Resolvable<boolean> = true): this {
			this._canWrap = condition;
			return this;
		}

		noWrap(): this {
			return this.wrap(false);
		}

		canWrap(): boolean {
			if (typeof this._canWrap === 'function') {
				return (this._canWrap as () => boolean)();
			}
			return this._canWrap;
		}
	};
}

export interface CanWrap {
	wrap(condition?: Resolvable<boolean>): this;
	noWrap(): this;
	canWrap(): boolean;
}
