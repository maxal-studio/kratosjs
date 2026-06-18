import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';

/**
 * Checkbox component
 */
export class Checkbox extends Field {
	protected componentType: string = 'checkbox';
	protected _isInline: Resolvable<boolean> = false;

	inline(condition: Resolvable<boolean> = true): this {
		this._isInline = condition;
		return this;
	}

	boolean(): this {
		// Mark this as a boolean checkbox
		return this;
	}

	isInline(): boolean {
		return this.evaluate(this._isInline);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'checkbox';

		if (this.isInline()) {
			json.inline = true;
		}

		return json;
	}

	static make(name: string): Checkbox {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
