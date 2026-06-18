import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { CanBeSearchable } from '../../concerns/CanBeSearchable';
import { CanFormatDate } from '../../concerns/CanFormatDate';
import { CanFormatMoney } from '../../concerns/CanFormatMoney';
import { CanDisplayAsBadge } from '../../concerns/CanDisplayAsBadge';
import { CanFormatList } from '../../concerns/CanFormatList';
import { HasWeight } from '../../concerns/HasWeight';
import { HasFontFamily } from '../../concerns/HasFontFamily';
import { HasLineClamp } from '../../concerns/HasLineClamp';
import { HasSize } from '../../concerns/HasSize';

/**
 * Base TextColumn without mixins
 */
class BaseTextColumn extends Column {
	protected columnType = 'text';
	protected _limit?: number;
	protected _limitedListExpandable: boolean = false;
	protected _rowIndex?: boolean;
	protected _rowIndexIsFromZero?: boolean;
	protected _stripHtml: boolean = true;

	/**
	 * Display row index as the column value
	 */
	rowIndex(isFromZero: boolean = false): this {
		this._rowIndex = true;
		this._rowIndexIsFromZero = isFromZero;
		return this;
	}

	/**
	 * Limit the number of items shown (for arrays)
	 */
	limit(limit: number): this {
		this._limit = limit;
		return this;
	}

	/**
	 * Make limited lists expandable
	 */
	limitedListExpandable(condition: boolean = true): this {
		this._limitedListExpandable = condition;
		return this;
	}

	/**
	 * Strip HTML tags from the value when rendering
	 * Enabled by default. Set to false to disable HTML stripping.
	 */
	stripHtml(condition: boolean = true): this {
		this._stripHtml = condition;
		return this;
	}

	isRowIndex(): boolean {
		return this._rowIndex || false;
	}

	isRowIndexFromZero(): boolean {
		return this._rowIndexIsFromZero || false;
	}

	getLimit(): number | undefined {
		return this._limit;
	}

	isLimitedListExpandable(): boolean {
		return this._limitedListExpandable;
	}

	isStripHtml(): boolean {
		return this._stripHtml;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		if (this._rowIndex) {
			json.rowIndex = true;
			json.rowIndexFromZero = this._rowIndexIsFromZero || false;
		}

		if (this._limit) {
			json.limit = this._limit;
			json.limitedListExpandable = this._limitedListExpandable;
		}

		// Add searchable
		if ((this as any).isSearchable?.()) {
			json.searchable = true;
			const searchColumns = (this as any).getSearchColumns?.();
			if (searchColumns) {
				json.searchColumns = searchColumns;
			}
		}

		// Add formatting options
		const dateFormat = (this as any).getDateFormat?.();
		if (dateFormat) {
			json.dateFormat = dateFormat;
			json.dateFormatString = (this as any).getDateFormatString?.();
		}

		const moneyFormat = (this as any).getMoneyFormat?.();
		if (moneyFormat) {
			json.moneyFormat = moneyFormat;
		}

		if ((this as any).isBadge?.()) {
			json.badge = true;
		}

		if ((this as any).isBulleted?.()) {
			json.bulleted = true;
		}

		if ((this as any).isListWithLineBreaks?.()) {
			json.listWithLineBreaks = true;
		}

		const listLimit = (this as any).getListLimit?.();
		if (listLimit) {
			json.listLimit = listLimit;
		}

		// Add text styling options
		const weight = (this as any).getWeight?.();
		if (weight) {
			json.weight = weight;
		}

		const fontFamily = (this as any).getFontFamily?.();
		if (fontFamily) {
			json.fontFamily = fontFamily;
		}

		const lineClamp = (this as any).getLineClamp?.();
		if (lineClamp) {
			json.lineClamp = lineClamp;
		}

		const size = (this as any).getSize?.();
		if (size) {
			json.size = size;
		}

		// Always serialize stripHtml to ensure frontend knows the setting
		json.stripHtml = this._stripHtml;

		// Add deeplink if present
		const deeplink = (this as any).getDeeplink?.();
		if (deeplink) {
			json.deeplink = {
				resource: deeplink.resource,
				page: deeplink.page,
				edit: deeplink.edit,
			};

			// Serialize id function if present
			if (deeplink.id) {
				if (typeof deeplink.id === 'function') {
					json.deeplink.idFn = deeplink.id.toString();
				} else {
					json.deeplink.id = deeplink.id;
				}
			}
		}

		return json;
	}
}

const TextColumnWithMixins = HasSize(
	HasLineClamp(
		HasFontFamily(
			HasWeight(CanFormatList(CanDisplayAsBadge(CanFormatMoney(CanFormatDate(CanBeSearchable(BaseTextColumn)))))),
		),
	),
);

export class TextColumn extends TextColumnWithMixins {
	static make(name: string): TextColumn {
		const column = new TextColumn(name);
		column.configure();
		return column;
	}
}
