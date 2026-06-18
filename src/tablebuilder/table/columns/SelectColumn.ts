import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { CanBeSearchable } from '../../concerns/CanBeSearchable';
import { CanUpdateState } from '../../concerns/CanUpdateState';
import { HasPlaceholder } from '../../concerns/HasPlaceholder';

/**
 * SelectColumn for inline dropdown selection
 */
class BaseSelectColumn extends Column {
	protected columnType = 'select';
	protected _options: Record<string, string> = {};
	protected _selectablePlaceholder: boolean = true;

	/**
	 * Set options for the select dropdown
	 */
	options(options: Record<string, string>): this {
		this._options = options;
		return this;
	}

	/**
	 * Make placeholder selectable (allows null value)
	 */
	selectablePlaceholder(condition: boolean = true): this {
		this._selectablePlaceholder = condition;
		return this;
	}

	getOptions(): Record<string, string> {
		return this._options;
	}

	isPlaceholderSelectable(): boolean {
		return this._selectablePlaceholder;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		json.options = this._options;
		json.selectablePlaceholder = this._selectablePlaceholder;

		// Add searchable
		if ((this as any).isSearchable?.()) {
			json.searchable = true;
			const searchColumns = (this as any).getSearchColumns?.();
			if (searchColumns) {
				json.searchColumns = searchColumns;
			}
		}

		// Add placeholder
		const placeholder = (this as any).getPlaceholder?.();
		if (placeholder) {
			json.placeholder = placeholder;
		}

		// Add state update callbacks
		const beforeStateUpdated = (this as any).getBeforeStateUpdated?.();
		if (beforeStateUpdated) {
			json.beforeStateUpdated = beforeStateUpdated.toString();
		}

		const afterStateUpdated = (this as any).getAfterStateUpdated?.();
		if (afterStateUpdated) {
			json.afterStateUpdated = afterStateUpdated.toString();
		}

		return json;
	}
}

// Apply editable column mixins
const SelectColumnWithMixins = HasPlaceholder(CanUpdateState(CanBeSearchable(BaseSelectColumn)));

export class SelectColumn extends SelectColumnWithMixins {
	static make(name: string): SelectColumn {
		const column = new SelectColumn(name);
		column.configure();
		return column;
	}
}
