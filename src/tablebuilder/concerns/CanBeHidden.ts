import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds visibility control to a column
 */
export function CanBeHidden<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeHidden> {
	return class extends Base {
		public _isHidden: Resolvable<boolean> = false;

		hidden(condition: Resolvable<boolean> = true): this {
			this._isHidden = condition;
			return this;
		}

		visible(condition: Resolvable<boolean> = true): this {
			if (typeof condition === 'function') {
				// Create a function that negates the result
				this._isHidden = ((get?: any) => {
					const result = (condition as any)(get);
					return !result;
				}) as any;
			} else {
				this._isHidden = !condition;
			}
			return this;
		}

		isHidden(): boolean {
			return this.evaluate(this._isHidden);
		}

		isVisible(): boolean {
			return !this.isHidden();
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

export interface CanBeHidden {
	hidden(condition?: Resolvable<boolean>): this;
	visible(condition?: Resolvable<boolean>): this;
	isHidden(): boolean;
	isVisible(): boolean;
}
