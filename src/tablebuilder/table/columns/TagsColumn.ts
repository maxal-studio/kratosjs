import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { CanBeSearchable } from '../../concerns/CanBeSearchable';

/**
 * Base TagsColumn without mixins
 */
class BaseTagsColumn extends Column {
	protected columnType = 'tags';
	protected _separator?: string;
	protected _limit?: number;

	/**
	 * Set separator for tags (if rendered as text)
	 */
	separator(separator: string): this {
		this._separator = separator;
		return this;
	}

	/**
	 * Limit number of tags shown
	 */
	limit(limit: number): this {
		this._limit = limit;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		if (this._separator) json.separator = this._separator;
		if (this._limit) json.limit = this._limit;

		// Add searchable
		if ((this as any).isSearchable?.()) {
			json.searchable = true;
			const searchColumns = (this as any).getSearchColumns?.();
			if (searchColumns) {
				json.searchColumns = searchColumns;
			}
		}

		return json;
	}
}

const TagsColumnWithMixins = CanBeSearchable(BaseTagsColumn);

export class TagsColumn extends TagsColumnWithMixins {
	static make(name: string): TagsColumn {
		const column = new TagsColumn(name);
		column.configure();
		return column;
	}
}
