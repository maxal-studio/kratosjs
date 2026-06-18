import { Constructor, Resolvable } from '../types';

export type Alignment = 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';

/**
 * Mixin that adds text alignment control
 */
export function HasAlignment<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasAlignment> {
	return class extends Base {
		public _alignment?: Resolvable<Alignment>;

		alignment(alignment: Resolvable<Alignment>): this {
			this._alignment = alignment;
			return this;
		}

		alignLeft(): this {
			return this.alignment('left');
		}

		alignCenter(): this {
			return this.alignment('center');
		}

		alignRight(): this {
			return this.alignment('right');
		}

		alignJustify(): this {
			return this.alignment('justify');
		}

		alignStart(): this {
			return this.alignment('start');
		}

		alignEnd(): this {
			return this.alignment('end');
		}

		getAlignment(): Alignment | undefined {
			if (typeof this._alignment === 'function') {
				return (this._alignment as () => Alignment)();
			}
			return this._alignment;
		}
	};
}

export interface HasAlignment {
	alignment(alignment: Resolvable<Alignment>): this;
	alignLeft(): this;
	alignCenter(): this;
	alignRight(): this;
	alignJustify(): this;
	alignStart(): this;
	alignEnd(): this;
	getAlignment(): Alignment | undefined;
}
