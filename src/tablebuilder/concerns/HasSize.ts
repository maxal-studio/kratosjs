import { Constructor, Resolvable } from '../types';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Mixin that adds size control (for text, icons, etc.)
 */
export function HasSize<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasSize> {
	return class extends Base {
		public _size?: Resolvable<Size | number>;

		size(size: Resolvable<Size | number>): this {
			this._size = size;
			return this;
		}

		getSize(): Size | number | undefined {
			if (typeof this._size === 'function') {
				return (this._size as () => Size | number)();
			}
			return this._size;
		}
	};
}

export interface HasSize {
	size(size: Resolvable<Size | number>): this;
	getSize(): Size | number | undefined;
}
