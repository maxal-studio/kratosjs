import { Resolvable, Constructor } from '../types';

/**
 * Mixin for components with descriptions
 */
export function HasDescription<TBase extends Constructor>(Base: TBase): TBase & Constructor<HasDescription> {
	return class extends Base {
		public _description: Resolvable<string> = '';

		description(text: Resolvable<string>): this {
			this._description = text;
			return this;
		}

		getDescription(): string {
			return (this as any).evaluate(this._description);
		}
	};
}

export interface HasDescription {
	description(text: Resolvable<string>): this;
	getDescription(): string;
}
