import { Field, type SerializedComponent } from '@maxal_studio/kratosjs';

/**
 * App-level custom form field — no plugin required.
 *
 * The backend only describes the field: it sets a `componentType` ('star-rating')
 * and serializes any extra props (here, `maxStars`). The matching React component
 * is registered in the admin client via `mountAdminPanel({ fields: { 'star-rating': ... } })`.
 */
export class StarRating extends Field {
	protected componentType = 'star-rating';
	private _maxStars = 5;

	/** Number of stars to render (default 5). */
	maxStars(count: number): this {
		this._maxStars = count;
		return this;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		if (this._maxStars !== 5) {
			(json as any).maxStars = this._maxStars;
		}
		return json;
	}

	static make(name: string): StarRating {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
