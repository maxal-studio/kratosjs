import { Field } from '../Field';
import { SerializedComponent } from '../../types';

/**
 * Hidden input component
 * Stores a value without rendering visible UI
 */
class BaseHiddenInput extends Field {
	protected componentType: string = 'hidden';

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'hidden';
		return json;
	}
}

export class HiddenInput extends BaseHiddenInput {
	static make(name: string): HiddenInput {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}

export interface HiddenInput {
	name(name: string): this;
	default(value: any): this;
}
