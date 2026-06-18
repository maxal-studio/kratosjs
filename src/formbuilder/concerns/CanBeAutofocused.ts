import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds autofocus capability to a component
 */
export function CanBeAutofocused<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeAutofocused> {
	return class extends Base {
		public _isAutofocused: Resolvable<boolean> = false;

		autofocus(condition: Resolvable<boolean> = true): this {
			this._isAutofocused = condition;
			return this;
		}

		isAutofocused(): boolean {
			return this.evaluate(this._isAutofocused);
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface CanBeAutofocused {
	autofocus(condition?: Resolvable<boolean>): this;
	isAutofocused(): boolean;
}
