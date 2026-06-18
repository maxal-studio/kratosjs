import { Column, type SerializedColumn } from '@maxal_studio/kratosjs';

/**
 * App-level custom table column — no plugin required.
 *
 * Mirrors the `star-rating` field: the backend serializes a `star-rating` column
 * (plus an optional `maxStars`), and the admin client renders it via
 * `mountAdminPanel({ columns: { 'star-rating': ... } })`.
 */
export class StarRatingColumn extends Column {
	protected columnType = 'star-rating';
	private _maxStars = 5;

	/** Number of stars to render (default 5). */
	maxStars(count: number): this {
		this._maxStars = count;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();
		if (this._maxStars !== 5) {
			(json as any).maxStars = this._maxStars;
		}
		return json;
	}

	static make(name: string): StarRatingColumn {
		const column = new StarRatingColumn(name);
		column.configure();
		return column;
	}
}
