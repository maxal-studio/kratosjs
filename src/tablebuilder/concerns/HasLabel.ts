import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds a label property to a component
 */
export function HasLabel<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasLabel> {
	return class extends Base {
		public _label?: Resolvable<string>;

		label(label: Resolvable<string>): this {
			this._label = label;
			return this;
		}

		getLabel(): string | undefined {
			if (typeof this._label === 'function') {
				return (this._label as () => string)();
			}
			return this._label;
		}
	};
}

export interface HasLabel {
	label(label: Resolvable<string>): this;
	getLabel(): string | undefined;
}
