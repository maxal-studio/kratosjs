import { Constructor } from '../types';

/**
 * Mixin that adds badge display functionality
 * Available only on TextColumn
 */
export function CanDisplayAsBadge<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanDisplayAsBadge> {
	return class extends Base {
		public _isBadge: boolean = false;

		/**
		 * Display the value as a badge/pill
		 * @example .badge() - displays value in a colored badge
		 */
		badge(condition: boolean = true): this {
			this._isBadge = condition;
			return this;
		}

		isBadge(): boolean {
			return this._isBadge;
		}
	};
}

export interface CanDisplayAsBadge {
	badge(condition?: boolean): this;
	isBadge(): boolean;
}
