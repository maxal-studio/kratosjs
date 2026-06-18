import { Column } from '../../Column';
import { SerializedColumn } from '../../types';

/**
 * ViewColumn for custom rendering
 */
export class ViewColumn extends Column {
	protected columnType = 'view';
	protected _view?: string;

	/**
	 * Set custom view/template identifier
	 */
	view(view: string): this {
		this._view = view;
		return this;
	}

	getView(): string | undefined {
		return this._view;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		if (this._view) json.view = this._view;

		return json;
	}

	static make(name: string): ViewColumn {
		const column = new ViewColumn(name);
		column.configure();
		return column;
	}
}
