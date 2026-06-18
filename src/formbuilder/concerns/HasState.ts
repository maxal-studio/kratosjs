import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds state management to a component
 */
export function HasState<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasState> {
	return class extends Base {
		public _statePath?: string;
		public _defaultState?: unknown;
		public _hasDefaultState: boolean = false;

		statePath(path: string): this {
			this._statePath = path;
			return this;
		}

		default(state: any): this {
			this._defaultState = state;
			this._hasDefaultState = true;
			return this;
		}

		getStatePath(): string | undefined {
			return this._statePath;
		}

		getDefaultState(): unknown {
			return this.evaluate(this._defaultState);
		}

		hasDefaultState(): boolean {
			return this._hasDefaultState;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as () => T)() : value;
		}
	};
}

export interface HasState {
	statePath(path: string): this;
	default(state: any): this;
	getStatePath(): string | undefined;
	getDefaultState(): unknown;
	hasDefaultState(): boolean;
}
