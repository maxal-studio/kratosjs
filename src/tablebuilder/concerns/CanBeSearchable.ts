import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds searchable functionality to a column
 */
export function CanBeSearchable<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeSearchable> {
	return class extends Base {
		public _isSearchable: Resolvable<boolean> = false;
		public _searchColumns?: string[];

		searchable(condition: Resolvable<boolean> = true): this {
			this._isSearchable = condition;
			return this;
		}

		searchUsing(columns: string[]): this {
			this._isSearchable = true;
			this._searchColumns = columns;
			return this;
		}

		isSearchable(): boolean {
			if (typeof this._isSearchable === 'function') {
				return (this._isSearchable as () => boolean)();
			}
			return this._isSearchable;
		}

		getSearchColumns(): string[] | undefined {
			return this._searchColumns;
		}
	};
}

export interface CanBeSearchable {
	searchable(condition?: Resolvable<boolean>): this;
	searchUsing(columns: string[]): this;
	isSearchable(): boolean;
	getSearchColumns(): string[] | undefined;
}
