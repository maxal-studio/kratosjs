import type { ResourceClass } from '../../../BaseResource';
import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';
import { HasOptions } from '../../concerns/HasOptions';
import { CanBeSearchable } from '../../concerns/CanBeSearchable';
import { HasPlaceholder } from '../../concerns/HasPlaceholder';

/**
 * SelectInput component
 */
class BaseSelectInput extends Field {
	protected componentType: string = 'select';
	protected _isMultiple: Resolvable<boolean> = false;
	protected _isNative: Resolvable<boolean> = false;
	protected _isCreatable: Resolvable<boolean> = false;
	protected _disabledOptions: (string | number)[] = [];
	protected _relationship?: {
		name: string;
		titleAttribute: string;
		resource: string;
	};
	protected _createOptionForm?: any[];
	protected _createOptionModalHeading?: string;
	protected _optionLabelFormatter?: (value: any, record: Record<string, any>) => any;

	multiple(condition: Resolvable<boolean> = true): this {
		this._isMultiple = condition;
		return this;
	}

	native(condition: Resolvable<boolean> = true): this {
		this._isNative = condition;
		return this;
	}

	creatable(condition: Resolvable<boolean> = true): this {
		this._isCreatable = condition;
		return this;
	}

	disableOption(option: string | number): this {
		if (!this._disabledOptions.includes(option)) {
			this._disabledOptions.push(option);
		}
		return this;
	}

	disableOptions(options: (string | number)[]): this {
		this._disabledOptions = [...this._disabledOptions, ...options];
		return this;
	}

	isMultiple(): boolean {
		return this.evaluate(this._isMultiple);
	}

	isNative(): boolean {
		return this.evaluate(this._isNative);
	}

	isCreatable(): boolean {
		return this.evaluate(this._isCreatable);
	}

	getDisabledOptions(): (string | number)[] {
		return this._disabledOptions;
	}

	/**
	 * Configure this select to load options from a database relationship
	 * @param name - The relationship name
	 * @param titleAttribute - The field to display as the option label
	 * @param resource - Related resource class or slug string (uses that resource's `slug` for API calls)
	 */
	relationship(name: string, titleAttribute: string, resource: ResourceClass | string): this {
		let resourceSlug: string;
		if (typeof resource === 'function' && resource.getSlug) {
			resourceSlug = resource.getSlug();
		} else if (typeof resource === 'string') {
			resourceSlug = resource;
		} else {
			throw new Error(
				'SelectInput.relationship() requires a related resource class or slug string as the third argument',
			);
		}

		this._relationship = { name, titleAttribute, resource: resourceSlug };
		return this;
	}

	/**
	 * Format the option label using a custom function
	 * Similar to formatStateUsing in table columns
	 * @param fn Function that receives (value, record) and returns formatted label (can be HTML string)
	 * @example
	 * .formatOptionLabelUsing((value, record) => `${record.name} (${record.email})`)
	 */
	formatOptionLabelUsing(fn: (value: any, record: Record<string, any>) => any): this {
		this._optionLabelFormatter = fn;
		return this;
	}

	getOptionLabelFormatter() {
		return this._optionLabelFormatter;
	}

	/**
	 * Define a form schema for creating new related records
	 * Opens a modal with this form when user wants to create a new option
	 */
	createOptionForm(schema: any[]): this {
		this._createOptionForm = schema;
		return this;
	}

	/**
	 * Set the heading for the create option modal
	 */
	createOptionModalHeading(heading: string): this {
		this._createOptionModalHeading = heading;
		return this;
	}

	getRelationship() {
		return this._relationship;
	}

	getCreateOptionForm() {
		return this._createOptionForm;
	}

	getCreateOptionModalHeading() {
		return this._createOptionModalHeading;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();

		json.type = 'select';

		const options = (this as any).getOptions?.();
		if (options) {
			json.options = options;
		}

		if (this.isMultiple()) {
			json.multiple = true;
		}

		if (this.isNative()) {
			json.native = true;
		}

		if (this.isCreatable()) {
			json.creatable = true;
		}

		// Add searchable
		if ((this as any).isSearchable?.()) {
			json.searchable = true;
		}

		// Add placeholder
		const placeholder = (this as any).getPlaceholder?.();
		if (placeholder) {
			json.placeholder = placeholder;
		}

		if (this._disabledOptions.length > 0) {
			json.disabledOptions = this._disabledOptions;
		}

		// Add relationship configuration
		if (this._relationship) {
			json.relationship = this._relationship;
		}

		// Add create option form configuration
		if (this._createOptionForm) {
			json.createOptionForm = this._createOptionForm;
		}

		if (this._createOptionModalHeading) {
			json.createOptionModalHeading = this._createOptionModalHeading;
		}

		// Serialize option label formatter as string
		if (this._optionLabelFormatter) {
			json.optionLabelFormatter = this._optionLabelFormatter.toString();
		}

		return json;
	}
}

// Apply mixins
const SelectInputWithMixins = HasPlaceholder(CanBeSearchable(HasOptions(BaseSelectInput)));

export class SelectInput extends SelectInputWithMixins {
	static make(name: string): SelectInput {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
