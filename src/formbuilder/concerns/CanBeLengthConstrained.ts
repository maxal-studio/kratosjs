import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds length constraints to a component
 */
export function CanBeLengthConstrained<TBase extends Constructor>(
	Base: TBase,
): TBase & Constructor<CanBeLengthConstrained> {
	return class extends Base {
		public _minLength?: number | Resolvable<number>;
		public _maxLength?: number | Resolvable<number>;
		public _length?: number | Resolvable<number>;

		minLength(length: number | Resolvable<number>): this {
			this._minLength = length;

			// Add validation rule
			const rule = typeof length === 'function' ? () => `min:${(length as () => number)()}` : `min:${length}`;

			(this as any).rule?.(rule);

			return this;
		}

		maxLength(length: number | Resolvable<number>): this {
			this._maxLength = length;

			// Add validation rule
			const rule = typeof length === 'function' ? () => `max:${(length as () => number)()}` : `max:${length}`;

			(this as any).rule?.(rule);

			return this;
		}

		length(length: number | Resolvable<number>): this {
			this._length = length;
			this.minLength(length);
			this.maxLength(length);
			return this;
		}

		getMinLength(): number | undefined {
			return this._minLength ? this.evaluate(this._minLength) : undefined;
		}

		getMaxLength(): number | undefined {
			return this._maxLength ? this.evaluate(this._maxLength) : undefined;
		}

		getLength(): number | undefined {
			return this._length ? this.evaluate(this._length) : undefined;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as () => T)() : value;
		}
	};
}

export interface CanBeLengthConstrained {
	minLength(length: number | Resolvable<number>): this;
	maxLength(length: number | Resolvable<number>): this;
	length(length: number | Resolvable<number>): this;
	getMinLength(): number | undefined;
	getMaxLength(): number | undefined;
	getLength(): number | undefined;
}
