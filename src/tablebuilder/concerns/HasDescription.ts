import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds description functionality (text below cell content)
 */
export function HasDescription<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasDescription> {
	return class extends Base {
		public _description?: Resolvable<string>;

		description(description: Resolvable<string>): this {
			this._description = description;
			return this;
		}

		getDescription(): string | undefined {
			if (typeof this._description === 'function') {
				return (this._description as () => string)();
			}
			return this._description;
		}

		hasDescription(): boolean {
			return this._description !== undefined;
		}
	};
}

export interface HasDescription {
	description(description: Resolvable<string>): this;
	getDescription(): string | undefined;
	hasDescription(): boolean;
}
