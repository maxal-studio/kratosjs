import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds disabled state control to a column
 */
export function CanBeDisabled<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeDisabled> {
	return class extends Base {
		public _isDisabled: Resolvable<boolean> = false;

		disabled(condition: Resolvable<boolean> = true): this {
			this._isDisabled = condition;
			return this;
		}

		enabled(condition: Resolvable<boolean> = true): this {
			if (typeof condition === 'function') {
				// Create a function that negates the result
				this._isDisabled = ((get?: any) => {
					const result = (condition as any)(get);
					return !result;
				}) as any;
			} else {
				this._isDisabled = !condition;
			}
			return this;
		}

		isDisabled(): boolean {
			return this.evaluate(this._isDisabled);
		}

		isEnabled(): boolean {
			return !this.isDisabled();
		}

		public evaluate<T>(value: Resolvable<T>): T {
			if (typeof value === 'function') {
				// For serialization purposes, we don't evaluate functions here
				// Functions are evaluated at runtime in the React component
				// For now, just return false as a placeholder
				return false as any;
			}
			return value;
		}
	};
}

export interface CanBeDisabled {
	disabled(condition?: Resolvable<boolean>): this;
	enabled(condition?: Resolvable<boolean>): this;
	isDisabled(): boolean;
	isEnabled(): boolean;
}
