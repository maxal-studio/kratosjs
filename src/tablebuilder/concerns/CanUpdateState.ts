import { Constructor } from '../types';

export type StateUpdateCallback = (newValue: any, record: any) => void | Promise<void>;

/**
 * Mixin that adds state update functionality for editable columns
 */
export function CanUpdateState<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanUpdateState> {
	return class extends Base {
		public _beforeStateUpdated?: StateUpdateCallback;
		public _afterStateUpdated?: StateUpdateCallback;

		beforeStateUpdated(callback: StateUpdateCallback): this {
			this._beforeStateUpdated = callback;
			return this;
		}

		afterStateUpdated(callback: StateUpdateCallback): this {
			this._afterStateUpdated = callback;
			return this;
		}

		getBeforeStateUpdated(): StateUpdateCallback | undefined {
			return this._beforeStateUpdated;
		}

		getAfterStateUpdated(): StateUpdateCallback | undefined {
			return this._afterStateUpdated;
		}
	};
}

export interface CanUpdateState {
	beforeStateUpdated(callback: StateUpdateCallback): this;
	afterStateUpdated(callback: StateUpdateCallback): this;
	getBeforeStateUpdated(): StateUpdateCallback | undefined;
	getAfterStateUpdated(): StateUpdateCallback | undefined;
}
