import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds HTML rendering capability to a component.
 * When true, the frontend will display the value as HTML in view mode (default: false).
 */
export function CanRenderHtml<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanRenderHtml> {
	return class extends Base {
		public _renderHtml: Resolvable<boolean> = false;

		renderHtml(condition: Resolvable<boolean> = true): this {
			this._renderHtml = condition;
			return this;
		}

		isRenderHtml(): boolean {
			return this.evaluate(this._renderHtml);
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface CanRenderHtml {
	renderHtml(condition?: Resolvable<boolean>): this;
	isRenderHtml(): boolean;
}
