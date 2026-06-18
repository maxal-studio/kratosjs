import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds searchable capability to a component
 */
export function CanBeSearchable<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeSearchable> {
	return class extends Base {
		public _isSearchable: Resolvable<boolean> = false;
		public _searchColumns?: string[];

		searchable(condition: Resolvable<boolean> | string[] = true): this {
			if (Array.isArray(condition)) {
				this._isSearchable = true;
				this._searchColumns = condition;
			} else {
				this._isSearchable = condition;
			}
			return this;
		}

		isSearchable(): boolean {
			return this.evaluate(this._isSearchable);
		}

		getSearchColumns(): string[] | undefined {
			return this._searchColumns;
		}

		public evaluate<T>(value: Resolvable<T>): T {
			return typeof value === 'function' ? (value as Function)() : value;
		}
	};
}

export interface CanBeSearchable {
	searchable(condition?: Resolvable<boolean> | string[]): this;
	isSearchable(): boolean;
	getSearchColumns(): string[] | undefined;
}
