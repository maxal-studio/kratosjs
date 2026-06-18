import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds options support to a component
 */
export function HasOptions<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasOptions> {
	return class extends Base {
		public _options?: Record<string | number, string> | Resolvable<Record<string | number, string>>;

		options(options: Record<string | number, string> | Resolvable<Record<string | number, string>>): this {
			this._options = options;
			return this;
		}

		getOptions(): Record<string | number, string> {
			if (!this._options) {
				return {};
			}
			return this.evaluate(this._options);
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface HasOptions {
	options(options: Record<string | number, string> | Resolvable<Record<string | number, string>>): this;
	getOptions(): Record<string | number, string>;
}
