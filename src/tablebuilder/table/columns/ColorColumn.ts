import { Column } from '../../Column';
import { SerializedColumn } from '../../types';

/**
 * ColorColumn for displaying color swatches
 */
export class ColorColumn extends Column {
	protected columnType = 'color';

	toJSON(): SerializedColumn {
		const json = super.toJSON();
		return json;
	}

	static make(name: string): ColorColumn {
		const column = new ColorColumn(name);
		column.configure();
		return column;
	}
}
