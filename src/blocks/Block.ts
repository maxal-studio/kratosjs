/**
 * Base Block class for page blocks
 * Blocks are composable units that can be used to build custom pages
 */
export interface SerializedBlock {
	type: 'widget' | 'form' | 'table' | 'tabs' | string;
	columns?: number; // Number of columns out of 12 (Bootstrap-style grid)
	title?: string;
	subtitle?: string;
	[key: string]: any;
}

export abstract class Block {
	protected abstract blockType: 'widget' | 'form' | 'table' | 'tabs' | string;
	protected _columns?: number; // Number of columns out of 12
	protected _title?: string;
	protected _subtitle?: string;

	/**
	 * Set the number of columns this block should take (out of 12)
	 * @param columns - Number of columns (1-12)
	 */
	columns(cols: number): this {
		if (cols < 1 || cols > 12) {
			throw new Error('Columns must be between 1 and 12');
		}
		this._columns = cols;
		return this;
	}

	/**
	 * Get the number of columns
	 */
	getColumns(): number | undefined {
		return this._columns;
	}

	/**
	 * Set the block title
	 * @param title - Title text
	 */
	title(title: string): this {
		this._title = title;
		return this;
	}

	/**
	 * Set the block subtitle
	 * @param subtitle - Subtitle text
	 */
	subtitle(subtitle: string): this {
		this._subtitle = subtitle;
		return this;
	}

	/**
	 * Serialize block to JSON
	 */
	abstract toJSON(): SerializedBlock;

	/**
	 * Static factory method
	 */
	static make(..._args: any[]): Block {
		throw new Error('Subclasses must implement make()');
	}
}
