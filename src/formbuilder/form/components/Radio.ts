import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';
import { HasOptions } from '../../concerns/HasOptions';

/**
 * Radio component
 */
class BaseRadio extends Field {
	protected componentType: string = 'radio';
	protected _isInline: Resolvable<boolean> = false;

	inline(condition: Resolvable<boolean> = true): this {
		this._isInline = condition;
		return this;
	}

	boolean(trueLabel: string = 'Yes', falseLabel: string = 'No'): this {
		(this as any).options({
			'1': trueLabel,
			'0': falseLabel,
		});
		return this;
	}

	isInline(): boolean {
		return this.evaluate(this._isInline);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'radio';

		const options = (this as any).getOptions?.();
		if (options) {
			json.options = options;
		}

		if (this.isInline()) {
			json.inline = true;
		}

		return json;
	}
}

// Apply mixins
const RadioWithMixins = HasOptions(BaseRadio);

export class Radio extends RadioWithMixins {
	static make(name: string): Radio {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
