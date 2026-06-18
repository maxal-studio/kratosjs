import { Block, SerializedBlock } from './Block';
import { SerializedTable, TableBuilder } from '../tablebuilder';

export interface SerializedTableBlock extends SerializedBlock {
	type: 'table';
	table: SerializedTable;
	dataUrl?: string;
}

/**
 * Block that displays a table
 */
export class TableBlock extends Block {
	protected blockType = 'table' as const;
	private _table: SerializedTable;
	private _dataUrl?: string;

	constructor(table: SerializedTable) {
		super();
		this._table = table;
	}

	/**
	 * Set the data URL (if different from default resource endpoint)
	 */
	dataUrl(url: string): this {
		this._dataUrl = url;
		return this;
	}

	/**
	 * Create a TableBlock
	 */
	static make(table: TableBuilder): TableBlock {
		return new TableBlock(table.toJSON());
	}

	/**
	 * Serialize block to JSON
	 */
	toJSON(): SerializedTableBlock {
		return {
			type: 'table',
			table: this._table,
			dataUrl: this._dataUrl,
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
