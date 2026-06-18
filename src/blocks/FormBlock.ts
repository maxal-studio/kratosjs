import { Block, SerializedBlock } from './Block';
import { FormBuilder, SerializedForm } from '../formbuilder';

export interface SerializedFormBlock extends SerializedBlock {
	type: 'form';
	form: SerializedForm;
	submitUrl?: string;
	dataUrl?: string;
	initialData?: Record<string, any>;
}

/**
 * Block that displays a form
 */
export class FormBlock extends Block {
	protected blockType = 'form' as const;
	private _form: SerializedForm;
	private _submitUrl?: string;
	private _dataUrl?: string;
	private _initialData?: Record<string, any>;

	constructor(form: SerializedForm) {
		super();
		this._form = form;
	}

	/**
	 * Set the submit URL (if different from default)
	 */
	submitUrl(url: string): this {
		this._submitUrl = url;
		return this;
	}

	/**
	 * Alias for submitUrl (more intuitive name for some use cases)
	 */
	saveUrl(url: string): this {
		return this.submitUrl(url);
	}

	/**
	 * Set the data URL to fetch initial form data from
	 */
	dataUrl(url: string): this {
		this._dataUrl = url;
		return this;
	}

	/**
	 * Set initial form data
	 */
	initialData(data: Record<string, any>): this {
		this._initialData = data;
		return this;
	}

	/**
	 * Create a FormBlock
	 */
	static make(form: FormBuilder): FormBlock {
		return new FormBlock(form.toJSON());
	}

	/**
	 * Serialize block to JSON
	 */
	toJSON(): SerializedFormBlock {
		return {
			type: 'form',
			form: this._form,
			submitUrl: this._submitUrl,
			dataUrl: this._dataUrl,
			initialData: this._initialData,
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
