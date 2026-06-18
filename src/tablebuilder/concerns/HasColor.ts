import { Constructor, Resolvable } from '../types';

export type Color = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'gray' | string;

/**
 * Mixin that adds color/badge color functionality
 */
export function HasColor<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasColor> {
	return class extends Base {
		public _color?: Resolvable<Color | Record<string, Color>>;

		color(color: Resolvable<Color>): this {
			this._color = color;
			return this;
		}

		colors(colors: Record<string, Color>): this {
			this._color = colors;
			return this;
		}

		getColor(): Color | Record<string, Color> | undefined {
			if (typeof this._color === 'function') {
				return (this._color as () => Color | Record<string, Color>)();
			}
			return this._color;
		}
	};
}

export interface HasColor {
	color(color: Resolvable<Color>): this;
	colors(colors: Record<string, Color>): this;
	getColor(): Color | Record<string, Color> | undefined;
}
