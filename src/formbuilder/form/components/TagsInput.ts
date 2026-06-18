import { Field } from '../Field';
import { SerializedComponent } from '../../types';
import { CanRenderHtml } from '../../concerns/CanRenderHtml';

/**
 * TagsInput component for managing arrays of simple values (strings, numbers)
 */
class BaseTagsInput extends Field {
	protected componentType: string = 'tags-input';
	protected _separator: string = ',';
	protected _suggestions?: string[];
	protected _minItems?: number;
	protected _maxItems?: number;
	protected _addable: boolean = true;
	protected _deletable: boolean = true;
	protected _reorderable: boolean = true;
	protected _showInPopup: boolean = false;

	/**
	 * Set the separator character for splitting input values
	 */
	separator(char: string): this {
		this._separator = char;
		return this;
	}

	/**
	 * Set suggestions for autocomplete
	 */
	suggestions(items: string[]): this {
		this._suggestions = items;
		return this;
	}

	/**
	 * Set minimum number of items
	 */
	minItems(min: number): this {
		this._minItems = min;
		return this;
	}

	/**
	 * Set maximum number of items
	 */
	maxItems(max: number): this {
		this._maxItems = max;
		return this;
	}

	/**
	 * Set whether items can be added
	 */
	addable(condition: boolean = true): this {
		this._addable = condition;
		return this;
	}

	/**
	 * Set whether items can be deleted
	 */
	deletable(condition: boolean = true): this {
		this._deletable = condition;
		return this;
	}

	/**
	 * Set whether items can be reordered
	 */
	reorderable(condition: boolean = true): this {
		this._reorderable = condition;
		return this;
	}

	/**
	 * Set whether to show tags in a popup in view mode (useful when there are many tags)
	 */
	showInPopup(condition: boolean = true): this {
		this._showInPopup = condition;
		return this;
	}

	/**
	 * Get the separator
	 */
	getSeparator(): string {
		return this._separator;
	}

	/**
	 * Get suggestions
	 */
	getSuggestions(): string[] | undefined {
		return this._suggestions;
	}

	/**
	 * Get minimum items
	 */
	getMinItems(): number | undefined {
		return this._minItems;
	}

	/**
	 * Get maximum items
	 */
	getMaxItems(): number | undefined {
		return this._maxItems;
	}

	/**
	 * Check if items can be added
	 */
	isAddable(): boolean {
		return this._addable;
	}

	/**
	 * Check if items can be deleted
	 */
	isDeletable(): boolean {
		return this._deletable;
	}

	/**
	 * Check if items can be reordered
	 */
	isReorderable(): boolean {
		return this._reorderable;
	}

	/**
	 * Check if tags should be shown in a popup in view mode
	 */
	isShowInPopup(): boolean {
		return this._showInPopup;
	}

	/**
	 * Override toJSON to include tags-specific properties
	 */
	toJSON(): SerializedComponent {
		const json = super.toJSON();

		json.type = 'tags-input';

		if (this._separator !== ',') {
			json.separator = this._separator;
		}

		if (this._suggestions && this._suggestions.length > 0) {
			json.suggestions = this._suggestions;
		}

		if (this._minItems !== undefined) {
			json.minItems = this._minItems;
		}

		if (this._maxItems !== undefined) {
			json.maxItems = this._maxItems;
		}

		if (!this._addable) {
			json.addable = false;
		}

		if (!this._deletable) {
			json.deletable = false;
		}

		if (!this._reorderable) {
			json.reorderable = false;
		}

		if ((this as any).isRenderHtml?.()) {
			json.renderHtml = true;
		}

		if (this._showInPopup) {
			json.showInPopup = true;
		}

		return json;
	}

	/**
	 * Static factory method
	 */
	static make(name: string): BaseTagsInput {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}

// Apply mixin
const TagsInputWithMixins = CanRenderHtml(BaseTagsInput);

export class TagsInput extends TagsInputWithMixins {
	static override make(name: string): TagsInput {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
