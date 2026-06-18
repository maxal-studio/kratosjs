import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds read-only state to a component
 */
export function CanBeReadOnly<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeReadOnly> {
	return class extends Base {
		public _isReadOnly: Resolvable<boolean> = false;

		readOnly(condition: Resolvable<boolean> = true): this {
			this._isReadOnly = condition;
			return this;
		}

		isReadOnly(): boolean {
			return this.evaluate(this._isReadOnly);
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface CanBeReadOnly {
	readOnly(condition?: Resolvable<boolean>): this;
	isReadOnly(): boolean;
}
