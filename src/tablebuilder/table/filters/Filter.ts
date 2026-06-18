import { SerializedFilter } from '../../types';

/**
 * Base Filter class
 */
export class Filter {
	protected _name: string;
	protected _label?: string;
	protected _default?: any;

	constructor(name: string) {
		this._name = name;
	}

	static make(name: string): Filter {
		return new Filter(name);
	}

	/**
	 * Set filter label
	 */
	label(label: string): this {
		this._label = label;
		return this;
	}

	/**
	 * Set default value
	 */
	default(value: any): this {
		this._default = value;
		return this;
	}

	getName(): string {
		return this._name;
	}

	getLabel(): string | undefined {
		return this._label;
	}

	getDefault(): any {
		return this._default;
	}

	toJSON(): SerializedFilter {
		return {
			type: 'filter',
			name: this._name,
			label: this._label,
			default: this._default,
		};
	}
}
