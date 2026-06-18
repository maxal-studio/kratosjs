import { Field } from '../Field';
import { SerializedComponent } from '../../types';

/**
 * ColorPicker component
 */
export class ColorPicker extends Field {
	protected componentType: string = 'color-picker';
	protected _format?: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla';

	format(format: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla'): this {
		this._format = format;
		return this;
	}

	hex(): this {
		return this.format('hex');
	}

	rgb(): this {
		return this.format('rgb');
	}

	rgba(): this {
		return this.format('rgba');
	}

	hsl(): this {
		return this.format('hsl');
	}

	hsla(): this {
		return this.format('hsla');
	}

	getFormat(): string {
		return this._format || 'hex';
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'color-picker';
		json.format = this.getFormat();

		return json;
	}

	static make(name: string): ColorPicker {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
