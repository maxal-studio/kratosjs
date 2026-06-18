import { Field } from '../Field';
import { SerializedComponent, Resolvable } from '../../types';

/**
 * Repeater component
 */
class BaseRepeater extends Field {
	protected componentType: string = 'repeater';
	protected _schema: Field[] = [];
	protected _defaultItems: number = 0;
	protected _minItems?: number;
	protected _maxItems?: number;
	protected _isAddable: boolean = true;
	protected _isDeletable: boolean = true;
	protected _isReorderable: boolean = true;
	protected _itemLabel?: string | Resolvable<string>;
	protected _isCollapsible: boolean = false;

	/**
	 * Set the schema (fields) for each repeater item
	 */
	schema(fields: Field[]): this {
		this._schema = fields;
		return this;
	}

	/**
	 * Set the default number of items to display
	 */
	defaultItems(count: number): this {
		this._defaultItems = count;
		return this;
	}

	/**
	 * Set the minimum number of items allowed
	 */
	minItems(min: number): this {
		this._minItems = min;
		return this;
	}

	/**
	 * Set the maximum number of items allowed
	 */
	maxItems(max: number): this {
		this._maxItems = max;
		return this;
	}

	/**
	 * Set whether items can be added
	 */
	addable(condition: boolean = true): this {
		this._isAddable = condition;
		return this;
	}

	/**
	 * Set whether items can be deleted
	 */
	deletable(condition: boolean = true): this {
		this._isDeletable = condition;
		return this;
	}

	/**
	 * Set whether items can be reordered
	 */
	reorderable(condition: boolean = true): this {
		this._isReorderable = condition;
		return this;
	}

	/**
	 * Set custom label for each item
	 */
	itemLabel(label: string | Resolvable<string>): this {
		this._itemLabel = label;
		return this;
	}

	/**
	 * Make items collapsible
	 */
	collapsible(condition: boolean = true): this {
		this._isCollapsible = condition;
		return this;
	}

	/**
	 * Get the nested schema
	 */
	getSchema(): Field[] {
		return this._schema;
	}

	getChildComponents(): Field[] {
		return this._schema;
	}

	/**
	 * Repeater holds an array value; its children form the per-item template.
	 * `childScope: 'array'` tells the shared traversal not to treat the item
	 * fields as top-level fields of the parent form.
	 */
	getChildScope(): 'inherit' | 'array' | undefined {
		return 'array';
	}

	/**
	 * Get the default items count
	 */
	getDefaultItems(): number {
		return this._defaultItems;
	}

	/**
	 * Get the minimum items
	 */
	getMinItems(): number | undefined {
		return this._minItems;
	}

	/**
	 * Get the maximum items
	 */
	getMaxItems(): number | undefined {
		return this._maxItems;
	}

	/**
	 * Check if items can be added
	 */
	isAddable(): boolean {
		return this._isAddable;
	}

	/**
	 * Check if items can be deleted
	 */
	isDeletable(): boolean {
		return this._isDeletable;
	}

	/**
	 * Check if items can be reordered
	 */
	isReorderable(): boolean {
		return this._isReorderable;
	}

	/**
	 * Get the item label
	 */
	getItemLabel(): string | undefined {
		return this._itemLabel ? this.evaluate(this._itemLabel) : undefined;
	}

	/**
	 * Check if items are collapsible
	 */
	isCollapsible(): boolean {
		return this._isCollapsible;
	}

	/**
	 * Override toJSON to include repeater-specific properties
	 */
	toJSON(): SerializedComponent {
		const json = super.toJSON();

		json.type = 'repeater';

		// `schema` (item template) is emitted by the base Component.toJSON()

		// Indicate that this layout component needs full record data
		// so that nested fields can access their values in view mode
		(json as any).needsRecordData = true;

		// Add repeater configuration
		if (this._defaultItems > 0) {
			json.defaultItems = this._defaultItems;
		}

		if (this._minItems !== undefined) {
			json.minItems = this._minItems;
		}

		if (this._maxItems !== undefined) {
			json.maxItems = this._maxItems;
		}

		if (!this._isAddable) {
			json.addable = false;
		}

		if (!this._isDeletable) {
			json.deletable = false;
		}

		if (!this._isReorderable) {
			json.reorderable = false;
		}

		const itemLabel = this.getItemLabel();
		if (itemLabel) {
			json.itemLabel = itemLabel;
		}

		if (this._isCollapsible) {
			json.collapsible = true;
		}

		return json;
	}

	/**
	 * Static factory method
	 */
	static make(name: string): Repeater {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}

export class Repeater extends BaseRepeater {}
