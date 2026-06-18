import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';

/**
 * Toggle component
 */
export class Toggle extends Field {
	protected componentType: string = 'toggle';
	protected _onIcon?: string;
	protected _offIcon?: string;
	protected _onColor?: string;
	protected _offColor?: string;
	protected _isInline: Resolvable<boolean> = false;

	inline(condition: Resolvable<boolean> = true): this {
		this._isInline = condition;
		return this;
	}

	onIcon(icon: string): this {
		this._onIcon = icon;
		return this;
	}

	offIcon(icon: string): this {
		this._offIcon = icon;
		return this;
	}

	onColor(color: string): this {
		this._onColor = color;
		return this;
	}

	offColor(color: string): this {
		this._offColor = color;
		return this;
	}

	boolean(): this {
		// Mark this as a boolean toggle
		return this;
	}

	isInline(): boolean {
		return this.evaluate(this._isInline);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'toggle';

		if (this.isInline()) {
			json.inline = true;
		}

		if (this._onIcon) {
			json.onIcon = this._onIcon;
		}

		if (this._offIcon) {
			json.offIcon = this._offIcon;
		}

		if (this._onColor) {
			json.onColor = this._onColor;
		}

		if (this._offColor) {
			json.offColor = this._offColor;
		}

		return json;
	}

	static make(name: string): Toggle {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
