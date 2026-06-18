import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { HasSize } from '../../concerns/HasSize';
import { IconName, IconColor, IconCallback, ColorCallback } from './lucideIcons';

/**
 * IconColumn for displaying Lucide icons
 * Supports static icons, object mappings, and callback functions
 */
class BaseIconColumn extends Column {
	protected columnType = 'icon';
	protected _icon?: string | Record<string, string> | IconCallback;
	protected _iconColor?: string | Record<string, string> | ColorCallback;
	protected _isListWithLineBreaks: boolean = false;

	/**
	 * Set the icon to display
	 * Supports three modes:
	 * 1. Static string: .icon('Check')
	 * 2. Object mapping: .icon({ draft: 'Edit', published: 'CheckCircle' })
	 * 3. Callback function: .icon((value, row) => value === 'active' ? 'Check' : 'X')
	 */
	icon(icon: IconName | Record<string, IconName> | IconCallback): this {
		this._icon = icon as any;
		return this;
	}

	/**
	 * Set the icon color
	 * Supports three modes:
	 * 1. Static string: .iconColor('text-green-600')
	 * 2. Object mapping: .iconColor({ draft: 'text-gray-600', published: 'text-green-600' })
	 * 3. Callback function: .iconColor((value, row) => value === 'active' ? 'text-green-600' : 'text-red-600')
	 */
	iconColor(color: IconColor | Record<string, IconColor> | ColorCallback): this {
		this._iconColor = color as any;
		return this;
	}

	/**
	 * Display list with line breaks
	 */
	listWithLineBreaks(condition: boolean = true): this {
		this._isListWithLineBreaks = condition;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		// Serialize icon
		if (this._icon) {
			if (typeof this._icon === 'function') {
				json.iconFn = this._icon.toString();
			} else if (typeof this._icon === 'string') {
				json.icon = this._icon;
			} else {
				json.icon = this._icon; // Object mapping
			}
		}

		// Serialize icon color
		if (this._iconColor) {
			if (typeof this._iconColor === 'function') {
				json.iconColorFn = this._iconColor.toString();
			} else if (typeof this._iconColor === 'string') {
				json.iconColor = this._iconColor;
			} else {
				json.iconColor = this._iconColor; // Object mapping
			}
		}

		if (this._isListWithLineBreaks) {
			json.listWithLineBreaks = true;
		}

		const size = (this as any).getSize?.();
		if (size) {
			json.size = size;
		}

		return json;
	}
}

// Apply icon-specific mixins
const IconColumnWithMixins = HasSize(BaseIconColumn);

export class IconColumn extends IconColumnWithMixins {
	static make(name: string): IconColumn {
		const column = new IconColumn(name);
		column.configure();
		return column;
	}
}
