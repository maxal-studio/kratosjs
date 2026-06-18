import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds placeholder text to a component
 */
export function HasPlaceholder<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasPlaceholder> {
	return class extends Base {
		public _placeholder?: Resolvable<string>;

		placeholder(text: Resolvable<string>): this {
			this._placeholder = text;
			return this;
		}

		getPlaceholder(): string | undefined {
			return this._placeholder ? this.evaluate(this._placeholder) : undefined;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface HasPlaceholder {
	placeholder(text: Resolvable<string>): this;
	getPlaceholder(): string | undefined;
}
