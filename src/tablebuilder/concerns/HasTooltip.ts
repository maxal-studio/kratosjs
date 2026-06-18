import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds tooltip functionality
 */
export function HasTooltip<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasTooltip> {
	return class extends Base {
		public _tooltip?: Resolvable<string>;

		tooltip(tooltip: Resolvable<string>): this {
			this._tooltip = tooltip;
			return this;
		}

		getTooltip(): string | undefined {
			if (typeof this._tooltip === 'function') {
				return (this._tooltip as () => string)();
			}
			return this._tooltip;
		}

		hasTooltip(): boolean {
			return this._tooltip !== undefined;
		}
	};
}

export interface HasTooltip {
	tooltip(tooltip: Resolvable<string>): this;
	getTooltip(): string | undefined;
	hasTooltip(): boolean;
}
