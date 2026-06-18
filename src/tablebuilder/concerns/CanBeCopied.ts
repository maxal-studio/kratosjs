import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds clipboard copy functionality
 */
export function CanBeCopied<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeCopied> {
	return class extends Base {
		public _isCopyable: Resolvable<boolean> = false;
		public _copyMessage?: string;
		public _copyMessageDuration?: number;

		copyable(condition: Resolvable<boolean> = true): this {
			this._isCopyable = condition;
			return this;
		}

		copyMessage(message: string): this {
			this._copyMessage = message;
			return this;
		}

		copyMessageDuration(duration: number): this {
			this._copyMessageDuration = duration;
			return this;
		}

		isCopyable(): boolean {
			if (typeof this._isCopyable === 'function') {
				return (this._isCopyable as () => boolean)();
			}
			return this._isCopyable;
		}

		getCopyMessage(): string | undefined {
			return this._copyMessage;
		}

		getCopyMessageDuration(): number | undefined {
			return this._copyMessageDuration;
		}
	};
}

export interface CanBeCopied {
	copyable(condition?: Resolvable<boolean>): this;
	copyMessage(message: string): this;
	copyMessageDuration(duration: number): this;
	isCopyable(): boolean;
	getCopyMessage(): string | undefined;
	getCopyMessageDuration(): number | undefined;
}
