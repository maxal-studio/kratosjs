import { Constructor } from '../types';

/**
 * Mixin that adds support for extra HTML attributes
 */
export function HasExtraAttributes<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasExtraAttributes> {
	return class extends Base {
		public _extraAttributes: Record<string, unknown> = {};

		extraAttributes(attributes: Record<string, any>): this {
			this._extraAttributes = { ...this._extraAttributes, ...attributes };
			return this;
		}

		extraAttribute(key: string, value: any): this {
			this._extraAttributes[key] = value;
			return this;
		}

		getExtraAttributes(): Record<string, unknown> {
			return { ...this._extraAttributes };
		}
	};
}

export interface HasExtraAttributes {
	extraAttributes(attributes: Record<string, any>): this;
	extraAttribute(key: string, value: any): this;
	getExtraAttributes(): Record<string, unknown>;
}
