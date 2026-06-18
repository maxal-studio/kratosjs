import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds helper text to a component
 */
export function HasHelperText<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasHelperText> {
	return class extends Base {
		public _helperText?: Resolvable<string>;

		helperText(text: Resolvable<string>): this {
			this._helperText = text;
			return this;
		}

		getHelperText(): string | undefined {
			return this._helperText ? this.evaluate(this._helperText) : undefined;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface HasHelperText {
	helperText(text: Resolvable<string>): this;
	getHelperText(): string | undefined;
}
