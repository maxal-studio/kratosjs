import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds state management to a column
 */
export function HasState<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasState> {
	return class extends Base {
		public _state?: Resolvable<any>;

		state(state: Resolvable<any>): this {
			this._state = state;
			return this;
		}

		getState(): any {
			if (typeof this._state === 'function') {
				return (this._state as () => any)();
			}
			return this._state;
		}
	};
}

export interface HasState {
	state(state: Resolvable<any>): this;
	getState(): any;
}
