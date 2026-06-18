import { Column } from '../../Column';
import { SerializedColumn } from '../../types';

/**
 * Thumbnail resolver function type
 * Receives the cell value and the entire row data
 * Returns the thumbnail URL or null
 */
export type ThumbnailFn = (value: any, row: Record<string, any>) => string | null;

/**
 * VideoColumn for displaying video thumbnails with preview popup
 * Shows a thumbnail image or a video icon, and opens a video player popup on click
 */
export class VideoColumn extends Column {
	protected columnType = 'video';
	protected _gridSpanFull: boolean = true; // Default to full width in grid view
	protected _height?: string | number;
	protected _thumbnail?: string | ThumbnailFn;
	protected _defaultThumbnail?: string;
	protected _placeholderIcon?: string = 'Video';
	protected _isCircular: boolean = false;
	protected _isSquare: boolean = false;
	protected _previewTitle?: string;
	protected _autoplay: boolean = false;
	protected _controls: boolean = true;
	protected _loop: boolean = false;
	protected _muted: boolean = false;
	protected _ratio: string = '16/9';

	/**
	 * Set video thumbnail height
	 */
	height(height: string | number): this {
		this._height = height;
		return this;
	}

	/**
	 * Set the thumbnail source - can be a field name or a function
	 * @param source Field name string or function (value, row) => thumbnailUrl
	 * @example
	 * // Use a field name
	 * .thumbnail('thumbnailUrl')
	 *
	 * // Use a function to compute thumbnail URL
	 * .thumbnail((value, row) => {
	 *     if (!row.mediaFile?.key) return null;
	 *     return `https://cdn.example.com/${row.mediaFile.key}`;
	 * })
	 */
	thumbnail(source: string | ThumbnailFn): this {
		this._thumbnail = source;
		return this;
	}

	/**
	 * Get the thumbnail resolver
	 */
	getThumbnail(): string | ThumbnailFn | undefined {
		return this._thumbnail;
	}

	/**
	 * Check if thumbnail is a function
	 */
	hasThumbnailFn(): boolean {
		return typeof this._thumbnail === 'function';
	}

	/**
	 * Set default thumbnail URL (fallback when no thumbnail available)
	 */
	defaultThumbnail(url: string): this {
		this._defaultThumbnail = url;
		return this;
	}

	/**
	 * Set placeholder icon when no thumbnail (Lucide icon name)
	 * @default 'Video'
	 */
	placeholderIcon(icon: string): this {
		this._placeholderIcon = icon;
		return this;
	}

	/**
	 * Make thumbnail circular
	 */
	circular(condition: boolean = true): this {
		this._isCircular = condition;
		return this;
	}

	/**
	 * Make thumbnail square
	 */
	square(condition: boolean = true): this {
		this._isSquare = condition;
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
	 * Auto-play video when preview opens
	 */
	autoplay(condition: boolean = true): this {
		this._autoplay = condition;
		return this;
	}

	/**
	 * Show video controls
	 * @default true
	 */
	controls(condition: boolean = true): this {
		this._controls = condition;
		return this;
	}

	/**
	 * Loop video playback
	 */
	loop(condition: boolean = true): this {
		this._loop = condition;
		return this;
	}

	/**
	 * Mute video by default
	 */
	muted(condition: boolean = true): this {
		this._muted = condition;
		return this;
	}

	/**
	 * Set aspect ratio for the video thumbnail
	 * @param ratio Aspect ratio string (e.g., '16/9', '4/3', '1/1', '9/16')
	 * @default '16/9'
	 */
	ratio(ratio: string): this {
		this._ratio = ratio;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		if (this._height) json.height = this._height;
		if (this._thumbnail) {
			if (typeof this._thumbnail === 'function') {
				// Serialize function as string for frontend
				json.thumbnailFn = this._thumbnail.toString();
			} else {
				json.thumbnailField = this._thumbnail;
			}
		}
		if (this._defaultThumbnail) json.defaultThumbnail = this._defaultThumbnail;
		if (this._placeholderIcon) json.placeholderIcon = this._placeholderIcon;
		if (this._isCircular) json.circular = true;
		if (this._isSquare) json.square = true;
		if (this._previewTitle) json.previewTitle = this._previewTitle;
		if (this._autoplay) json.autoplay = true;
		if (!this._controls) json.controls = false;
		if (this._loop) json.loop = true;
		if (this._muted) json.muted = true;
		json.ratio = this._ratio;

		return json;
	}

	static make(name: string): VideoColumn {
		const column = new VideoColumn(name);
		column.configure();
		return column;
	}
}
