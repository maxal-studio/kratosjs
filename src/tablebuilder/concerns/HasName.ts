import { Constructor } from '../types';

/**
 * Mixin that adds a name property to a component
 */
export function HasName<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasName> {
	return class extends Base {
		public _name: string = '';

		name(name: string): this {
			this._name = name;
			return this;
		}

		getName(): string {
			return this._name;
		}
	};
}

export interface HasName {
	name(name: string): this;
	getName(): string;
}
