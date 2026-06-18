import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds label property and methods to a component
 */
export function HasLabel<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasLabel> {
	return class extends Base {
		public _label?: Resolvable<string>;
		public _isLabelHidden: boolean = false;
		public _shouldTranslateLabel: boolean = false;

		label(label: Resolvable<string>): this {
			this._label = label;
			return this;
		}

		hiddenLabel(condition: boolean = true): this {
			this._isLabelHidden = condition;
			return this;
		}

		translateLabel(shouldTranslate: boolean = true): this {
			this._shouldTranslateLabel = shouldTranslate;
			return this;
		}

		getLabel(): string | undefined {
			if (this._label === undefined) {
				return undefined;
			}

			const label = this.evaluate(this._label);

			// In a real implementation, you'd use an i18n library here
			return this._shouldTranslateLabel ? label : label;
		}

		isLabelHidden(): boolean {
			return this._isLabelHidden;
		}

		hasCustomLabel(): boolean {
			return this._label !== undefined;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as () => T)() : value;
		}
	};
}

export interface HasLabel {
	label(label: Resolvable<string>): this;
	hiddenLabel(condition?: boolean): this;
	translateLabel(shouldTranslate?: boolean): this;
	getLabel(): string | undefined;
	isLabelHidden(): boolean;
	hasCustomLabel(): boolean;
}
