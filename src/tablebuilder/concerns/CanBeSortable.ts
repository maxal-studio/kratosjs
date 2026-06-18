import { Constructor, Resolvable } from '../types';

/**
 * Mixin that adds sortable functionality to a column
 */
export function CanBeSortable<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanBeSortable> {
	return class extends Base {
		public _isSortable: Resolvable<boolean> = false;
		public _sortColumn?: string;

		sortable(condition: Resolvable<boolean> = true): this {
			this._isSortable = condition;
			return this;
		}

		sortUsing(column: string): this {
			this._isSortable = true;
			this._sortColumn = column;
			return this;
		}

		isSortable(): boolean {
			if (typeof this._isSortable === 'function') {
				return (this._isSortable as () => boolean)();
			}
			return this._isSortable;
		}

		getSortColumn(): string | undefined {
			return this._sortColumn;
		}
	};
}

export interface CanBeSortable {
	sortable(condition?: Resolvable<boolean>): this;
	sortUsing(column: string): this;
	isSortable(): boolean;
	getSortColumn(): string | undefined;
}
