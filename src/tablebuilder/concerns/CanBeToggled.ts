import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds toggleable (show/hide) functionality to a column
 */
export function CanBeToggled<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeToggled> {
	return class extends Base {
		public _isToggleable: Resolvable<boolean> = true;
		public _isToggledHiddenByDefault: boolean = false;

		toggleable(condition: Resolvable<boolean> = true, isHiddenByDefault: boolean = false): this {
			this._isToggleable = condition;
			this._isToggledHiddenByDefault = isHiddenByDefault;
			return this;
		}

		isToggleable(): boolean {
			if (typeof this._isToggleable === 'function') {
				return (this._isToggleable as () => boolean)();
			}
			return this._isToggleable;
		}

		isToggledHiddenByDefault(): boolean {
			return this._isToggledHiddenByDefault;
		}
	};
}

export interface CanBeToggled {
	toggleable(condition?: Resolvable<boolean>, isHiddenByDefault?: boolean): this;
	isToggleable(): boolean;
	isToggledHiddenByDefault(): boolean;
}
