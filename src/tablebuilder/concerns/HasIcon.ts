import { Constructor, Resolvable } from '../types';

export type IconPosition = 'before' | 'after';

/**
 * Mixin that adds icon functionality
 */
export function HasIcon<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasIcon> {
	return class extends Base {
		public _icon?: Resolvable<string | Record<string, string>>;
		public _iconPosition: IconPosition = 'before';

		icon(icon: Resolvable<string>): this {
			this._icon = icon;
			return this;
		}

		icons(icons: Record<string, string>): this {
			this._icon = icons;
			return this;
		}

		iconPosition(position: IconPosition): this {
			this._iconPosition = position;
			return this;
		}

		getIcon(): string | Record<string, string> | undefined {
			if (typeof this._icon === 'function') {
				return (this._icon as () => string | Record<string, string>)();
			}
			return this._icon;
		}

		getIconPosition(): IconPosition {
			return this._iconPosition;
		}
	};
}

export interface HasIcon {
	icon(icon: Resolvable<string>): this;
	icons(icons: Record<string, string>): this;
	iconPosition(position: IconPosition): this;
	getIcon(): string | Record<string, string> | undefined;
	getIconPosition(): IconPosition;
}
