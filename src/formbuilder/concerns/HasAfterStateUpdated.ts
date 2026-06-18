import { Constructor } from '../types';

/**
 * Callback type for afterStateUpdated
 * @param get - Function to get field values
 * @param set - Function to set field values
 * @param state - Current (new) value of the field
 * @param old - Previous value of the field
 */
export type AfterStateUpdatedCallback = (
	get: (field: string) => any,
	set: (field: string, value: any) => void,
	state: any,
	old: any,
) => void;

/**
 * Mixin that adds afterStateUpdated callback support
 */
export function HasAfterStateUpdated<TBase extends Constructor>(
	Base: TBase,
): TBase & Constructor<HasAfterStateUpdated> {
	return class extends Base {
		public _afterStateUpdated?: AfterStateUpdatedCallback;

		/**
		 * Register a callback to run when the field's value changes
		 * @param callback Function that receives get, set, state (new value), and old value
		 */
		afterStateUpdated(callback: AfterStateUpdatedCallback): this {
			this._afterStateUpdated = callback;
			return this;
		}

		/**
		 * Alias for afterStateUpdated (shorter name)
		 */
		onUpdate(callback: AfterStateUpdatedCallback): this {
			return this.afterStateUpdated(callback);
		}

		getAfterStateUpdatedCallback(): AfterStateUpdatedCallback | undefined {
			return this._afterStateUpdated;
		}
	};
}

export interface HasAfterStateUpdated {
	afterStateUpdated(callback: AfterStateUpdatedCallback): this;
	onUpdate(callback: AfterStateUpdatedCallback): this;
	getAfterStateUpdatedCallback(): AfterStateUpdatedCallback | undefined;
}
