import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds placeholder functionality
 */
export function HasPlaceholder<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasPlaceholder> {
	return class extends Base {
		public _placeholder?: Resolvable<string>;

		placeholder(placeholder: Resolvable<string>): this {
			this._placeholder = placeholder;
			return this;
		}

		getPlaceholder(): string | undefined {
			if (typeof this._placeholder === 'function') {
				return (this._placeholder as () => string)();
			}
			return this._placeholder;
		}
	};
}

export interface HasPlaceholder {
	placeholder(placeholder: Resolvable<string>): this;
	getPlaceholder(): string | undefined;
}
