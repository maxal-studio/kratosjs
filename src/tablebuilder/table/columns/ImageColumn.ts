import { Column } from '../../Column';
import { SerializedColumn } from '../../types';

/**
 * ImageColumn for displaying images
 */
export class ImageColumn extends Column {
	protected columnType = 'image';
	protected _disk?: string;
	protected _gridSpanFull: boolean = true; // Default to full width in grid view
	protected _height?: string | number;
	// _width is inherited from HasWidth mixin
	protected _isCircular: boolean = false;
	protected _isSquare: boolean = false;
	protected _visibility?: 'public' | 'private';
	protected _defaultImageUrl?: string;
	protected _isStacked: boolean = false;
	protected _overlap?: number;
	protected _ring?: number;
	protected _limit?: number;
	protected _hasLimitedRemainingText: boolean = false;
	protected _isClickable: boolean = false;
	protected _clickAction?: 'preview' | 'link';
	protected _previewTitle?: string;
	protected _ratio: string = '16/9';

	/**
	 * Set storage disk
	 */
	disk(disk: string): this {
		this._disk = disk;
		return this;
	}

	/**
	 * Set image height
	 */
	height(height: string | number): this {
		this._height = height;
		return this;
	}

	/**
	 * Set image width
	 * Note: This uses the inherited width() method from HasWidth mixin
	 */

	/**
	 * Make image circular
	 */
	circular(condition: boolean = true): this {
		this._isCircular = condition;
		return this;
	}

	/**
	 * Make image square
	 */
	square(condition: boolean = true): this {
		this._isSquare = condition;
		return this;
	}

	/**
	 * Set visibility
	 */
	visibility(visibility: 'public' | 'private'): this {
		this._visibility = visibility;
		return this;
	}

	/**
	 * Set default image URL (fallback)
	 */
	defaultImageUrl(url: string): this {
		this._defaultImageUrl = url;
		return this;
	}

	/**
	 * Stack images (for arrays)
	 */
	stacked(condition: boolean = true): this {
		this._isStacked = condition;
		return this;
	}

	/**
	 * Set overlap amount for stacked images
	 */
	overlap(overlap: number): this {
		this._overlap = overlap;
		this._isStacked = true;
		return this;
	}

	/**
	 * Set ring width for stacked images
	 */
	ring(ring: number): this {
		this._ring = ring;
		this._isStacked = true;
		return this;
	}

	/**
	 * Limit number of images shown (for arrays)
	 */
	limit(limit: number): this {
		this._limit = limit;
		return this;
	}

	/**
	 * Show remaining count text for limited images
	 */
	limitedRemainingText(condition: boolean = true): this {
		this._hasLimitedRemainingText = condition;
		return this;
	}

	/**
	 * Make image clickable to open preview popup
	 * @param title Optional title for the preview modal
	 */
	clickable(title?: string): this {
		this._isClickable = true;
		this._clickAction = 'preview';
		if (title) this._previewTitle = title;
		return this;
	}

	/**
	 * Make image clickable to open in new tab (link mode)
	 */
	openInNewTab(): this {
		this._isClickable = true;
		this._clickAction = 'link';
		return this;
	}

	/**
	 * Set preview modal title
	 */
	previewTitle(title: string): this {
		this._previewTitle = title;
		return this;
	}

	/**
	 * Set aspect ratio for the image thumbnail
	 * @param ratio Aspect ratio string (e.g., '16/9', '4/3', '1/1', '9/16')
	 * @default '16/9'
	 */
	ratio(ratio: string): this {
		this._ratio = ratio;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		if (this._disk) json.disk = this._disk;
		if (this._height) json.height = this._height;
		if (this._isCircular) json.circular = true;
		if (this._isSquare) json.square = true;
		if (this._visibility) json.visibility = this._visibility;
		if (this._defaultImageUrl) json.defaultImageUrl = this._defaultImageUrl;
		if (this._isStacked) json.stacked = true;
		if (this._overlap) json.overlap = this._overlap;
		if (this._ring) json.ring = this._ring;
		if (this._limit) json.limit = this._limit;
		if (this._hasLimitedRemainingText) json.limitedRemainingText = true;
		if (this._isClickable) json.clickable = true;
		if (this._clickAction) json.clickAction = this._clickAction;
		if (this._previewTitle) json.previewTitle = this._previewTitle;
		json.ratio = this._ratio;

		// Add deeplink if present
		const deeplink = this.getDeeplink?.();
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

	static make(name: string): ImageColumn {
		const column = new ImageColumn(name);
		column.configure();
		return column;
	}
}
