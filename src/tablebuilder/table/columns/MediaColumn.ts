import { Column } from '../../Column';
import { SerializedColumn } from '../../types';

/**
 * Media type - 'image', 'video', or 'audio'
 */
export type MediaType = 'image' | 'video' | 'audio';

/**
 * Media type resolver function
 * Receives the cell value and the entire row data
 * Returns the media type or null to hide
 */
export type MediaTypeFn = (value: any, row: Record<string, any>) => MediaType | null;

/**
 * Thumbnail resolver function
 * Receives the cell value and the entire row data
 * Returns the thumbnail URL or null
 */
export type ThumbnailFn = (value: any, row: Record<string, any>) => string | null;

/**
 * MediaColumn for displaying images and videos with preview popup
 * Unified column that handles both image and video content types
 *
 * @example
 * // Static image type
 * MediaColumn.make('profileImage')
 *     .type('image')
 *     .clickable()
 *
 * // Static video type
 * MediaColumn.make('videoUrl')
 *     .type('video')
 *     .autoplay()
 *
 * // Static audio type
 * MediaColumn.make('audioUrl')
 *     .type('audio')
 *     .controls()
 *
 * // Dynamic type based on row data
 * MediaColumn.make('mediaFile')
 *     .type((value, row) => {
 *         if (row.isVideoContent) return 'video';
 *         if (row.isImageContent) return 'image';
 *         if (row.isAudioContent) return 'audio';
 *         return null; // Hide if neither
 *     })
 *     .thumbnail((value, row) => row.thumbnailUrl)
 */
export class MediaColumn extends Column {
	protected columnType = 'media';
	protected _mediaType: MediaType | MediaTypeFn = 'image';
	protected _gridSpanFull: boolean = true; // Default to full width in grid view
	protected _height?: string | number;
	protected _thumbnail?: string | ThumbnailFn;
	protected _defaultThumbnail?: string;
	protected _placeholderIcon?: string;
	protected _isCircular: boolean = false;
	protected _isSquare: boolean = false;
	protected _isClickable: boolean = true; // Default to clickable
	protected _clickAction?: 'preview' | 'link';
	protected _previewTitle?: string;
	// Video-specific options
	protected _autoplay: boolean = false;
	protected _controls: boolean = true;
	protected _loop: boolean = false;
	protected _muted: boolean = false;
	// Image-specific options
	protected _defaultImageUrl?: string;
	protected _isStacked: boolean = false;
	protected _overlap?: number;
	protected _ring?: number;
	protected _limit?: number;
	protected _hasLimitedRemainingText: boolean = false;
	// Aspect ratio
	protected _ratio: string = '16/9';

	/**
	 * Set the media type - can be a static type or a function
	 * @param mediaType 'image', 'video', or function (value, row) => 'image' | 'video' | null
	 */
	type(mediaType: MediaType | MediaTypeFn): this {
		this._mediaType = mediaType;
		return this;
	}

	/**
	 * Get the media type resolver
	 */
	getMediaType(): MediaType | MediaTypeFn {
		return this._mediaType;
	}

	/**
	 * Check if media type is a function
	 */
	hasMediaTypeFn(): boolean {
		return typeof this._mediaType === 'function';
	}

	/**
	 * Set media height
	 */
	height(height: string | number): this {
		this._height = height;
		return this;
	}

	/**
	 * Set the thumbnail source - can be a field name or a function
	 * @param source Field name string or function (value, row) => thumbnailUrl
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
	 * Set default thumbnail URL (fallback for videos)
	 */
	defaultThumbnail(url: string): this {
		this._defaultThumbnail = url;
		return this;
	}

	/**
	 * Set default image URL (fallback for images)
	 */
	defaultImageUrl(url: string): this {
		this._defaultImageUrl = url;
		return this;
	}

	/**
	 * Set placeholder icon (Lucide icon name)
	 * Defaults to 'Image' for images, 'Video' for videos
	 */
	placeholderIcon(icon: string): this {
		this._placeholderIcon = icon;
		return this;
	}

	/**
	 * Make media circular
	 */
	circular(condition: boolean = true): this {
		this._isCircular = condition;
		return this;
	}

	/**
	 * Make media square
	 */
	square(condition: boolean = true): this {
		this._isSquare = condition;
		return this;
	}

	/**
	 * Make media clickable to open preview popup
	 * @param title Optional title for the preview modal
	 */
	clickable(title?: string): this {
		this._isClickable = true;
		this._clickAction = 'preview';
		if (title) this._previewTitle = title;
		return this;
	}

	/**
	 * Disable click behavior
	 */
	notClickable(): this {
		this._isClickable = false;
		return this;
	}

	/**
	 * Make media clickable to open in new tab (link mode)
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

	// Video-specific methods

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

	// Image-specific methods (for array images)

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
	 * Set aspect ratio for the media thumbnail
	 * @param ratio Aspect ratio string (e.g., '16/9', '4/3', '1/1', '9/16')
	 * @default '16/9'
	 */
	ratio(ratio: string): this {
		this._ratio = ratio;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		// Media type
		if (typeof this._mediaType === 'function') {
			json.mediaTypeFn = this._mediaType.toString();
		} else {
			json.mediaType = this._mediaType;
		}

		// Common options
		if (this._height) json.height = this._height;
		if (this._thumbnail) {
			if (typeof this._thumbnail === 'function') {
				json.thumbnailFn = this._thumbnail.toString();
			} else {
				json.thumbnailField = this._thumbnail;
			}
		}
		if (this._defaultThumbnail) json.defaultThumbnail = this._defaultThumbnail;
		if (this._defaultImageUrl) json.defaultImageUrl = this._defaultImageUrl;
		if (this._placeholderIcon) json.placeholderIcon = this._placeholderIcon;
		if (this._isCircular) json.circular = true;
		if (this._isSquare) json.square = true;
		if (this._isClickable) json.clickable = true;
		if (this._clickAction) json.clickAction = this._clickAction;
		if (this._previewTitle) json.previewTitle = this._previewTitle;

		// Video options
		if (this._autoplay) json.autoplay = true;
		if (!this._controls) json.controls = false;
		if (this._loop) json.loop = true;
		if (this._muted) json.muted = true;

		// Image array options
		if (this._isStacked) json.stacked = true;
		if (this._overlap) json.overlap = this._overlap;
		if (this._ring) json.ring = this._ring;
		if (this._limit) json.limit = this._limit;
		if (this._hasLimitedRemainingText) json.limitedRemainingText = true;

		// Aspect ratio
		json.ratio = this._ratio;

		return json;
	}

	static make(name: string): MediaColumn {
		const column = new MediaColumn(name);
		column.configure();
		return column;
	}
}
