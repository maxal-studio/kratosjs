import { Constructor, Resolvable } from '../types';

export type FontFamily = 'sans' | 'serif' | 'mono';

/**
 * Mixin that adds font family control
 */
export function HasFontFamily<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasFontFamily> {
	return class extends Base {
		public _fontFamily?: Resolvable<FontFamily>;

		fontFamily(fontFamily: Resolvable<FontFamily>): this {
			this._fontFamily = fontFamily;
			return this;
		}

		getFontFamily(): FontFamily | undefined {
			if (typeof this._fontFamily === 'function') {
				return (this._fontFamily as () => FontFamily)();
			}
			return this._fontFamily;
		}
	};
}

export interface HasFontFamily {
	fontFamily(fontFamily: Resolvable<FontFamily>): this;
	getFontFamily(): FontFamily | undefined;
}
