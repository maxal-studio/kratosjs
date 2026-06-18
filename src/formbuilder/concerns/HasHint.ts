import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds hint to a component
 */
export function HasHint<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasHint> {
	return class extends Base {
		public _hint?: Resolvable<string>;
		public _hintIcon?: string;
		public _hintColor?: string;

		hint(text: Resolvable<string>): this {
			this._hint = text;
			return this;
		}

		hintIcon(icon: string): this {
			this._hintIcon = icon;
			return this;
		}

		hintColor(color: string): this {
			this._hintColor = color;
			return this;
		}

		getHint(): string | undefined {
			return this._hint ? this.evaluate(this._hint) : undefined;
		}

		getHintIcon(): string | undefined {
			return this._hintIcon;
		}

		getHintColor(): string | undefined {
			return this._hintColor;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface HasHint {
	hint(text: Resolvable<string>): this;
	hintIcon(icon: string): this;
	hintColor(color: string): this;
	getHint(): string | undefined;
	getHintIcon(): string | undefined;
	getHintColor(): string | undefined;
}
