import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { CanUpdateState } from '../../concerns/CanUpdateState';

/**
 * ToggleColumn for inline toggle switch editing
 */
class BaseToggleColumn extends Column {
	protected columnType = 'toggle';
	protected _onIcon?: string;
	protected _offIcon?: string;
	protected _onColor?: string;
	protected _offColor?: string;

	/**
	 * Set icon for "on" state
	 */
	onIcon(icon: string): this {
		this._onIcon = icon;
		return this;
	}

	/**
	 * Set icon for "off" state
	 */
	offIcon(icon: string): this {
		this._offIcon = icon;
		return this;
	}

	/**
	 * Set color for "on" state
	 */
	onColor(color: string): this {
		this._onColor = color;
		return this;
	}

	/**
	 * Set color for "off" state
	 */
	offColor(color: string): this {
		this._offColor = color;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		if (this._onIcon) json.onIcon = this._onIcon;
		if (this._offIcon) json.offIcon = this._offIcon;
		if (this._onColor) json.onColor = this._onColor;
		if (this._offColor) json.offColor = this._offColor;

		// Add state update callbacks
		const beforeStateUpdated = (this as any).getBeforeStateUpdated?.();
		if (beforeStateUpdated) {
			json.beforeStateUpdated = beforeStateUpdated.toString();
		}

		const afterStateUpdated = (this as any).getAfterStateUpdated?.();
		if (afterStateUpdated) {
			json.afterStateUpdated = afterStateUpdated.toString();
		}

		return json;
	}
}

// Apply editable column mixins
const ToggleColumnWithMixins = CanUpdateState(BaseToggleColumn);

export class ToggleColumn extends ToggleColumnWithMixins {
	static make(name: string): ToggleColumn {
		const column = new ToggleColumn(name);
		column.configure();
		return column;
	}
}
