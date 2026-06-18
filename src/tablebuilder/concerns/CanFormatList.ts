import { Constructor } from '../types';

/**
 * Mixin that adds list formatting functionality
 * Available only on TextColumn for array values
 */
export function CanFormatList<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanFormatList> {
	return class extends Base {
		public _isBulleted: boolean = false;
		public _isListWithLineBreaks: boolean = false;
		public _listLimit?: number;

		/**
		 * Display array values as a bulleted list
		 * @example .bulleted() - displays ["a", "b", "c"] as bullet points
		 */
		bulleted(condition: boolean = true): this {
			this._isBulleted = condition;
			return this;
		}

		/**
		 * Display array values with line breaks between items
		 * @example .listWithLineBreaks() - displays each item on a new line
		 */
		listWithLineBreaks(condition: boolean = true): this {
			this._isListWithLineBreaks = condition;
			return this;
		}

		/**
		 * Limit the number of items shown in a list
		 * @param limit Maximum number of items to display
		 * @example .limitList(3) - shows first 3 items with "+N more"
		 */
		limitList(limit: number = 3): this {
			this._listLimit = limit;
			return this;
		}

		isBulleted(): boolean {
			return this._isBulleted;
		}

		isListWithLineBreaks(): boolean {
			return this._isListWithLineBreaks;
		}

		getListLimit(): number | undefined {
			return this._listLimit;
		}
	};
}

export interface CanFormatList {
	bulleted(condition?: boolean): this;
	listWithLineBreaks(condition?: boolean): this;
	limitList(limit?: number): this;
	isBulleted(): boolean;
	isListWithLineBreaks(): boolean;
	getListLimit(): number | undefined;
}
