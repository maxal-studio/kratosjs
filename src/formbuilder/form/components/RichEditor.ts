import { Field } from '../Field';
import { Resolvable, SerializedComponent } from '../../types';
import { HasPlaceholder } from '../../concerns/HasPlaceholder';
import { CanBeLengthConstrained } from '../../concerns/CanBeLengthConstrained';

/**
 * RichEditor component
 * Rich text editor with formatting toolbar
 */
class BaseRichEditor extends Field {
	protected componentType: string = 'richEditor';
	protected _toolbarButtons: string[] = [
		'bold',
		'italic',
		'underline',
		'strike',
		'code',
		'h1',
		'h2',
		'h3',
		'bulletList',
		'orderedList',
		'blockquote',
		'codeBlock',
		'link',
		'audio',
		'image',
		'video',
		'embed',
		'subscript',
		'superscript',
		'highlight',
		'alignLeft',
		'alignCenter',
		'alignRight',
		'undo',
		'redo',
		'htmlSource',
	];
	protected _disabledButtons: string[] = [];
	protected _fileAttachments: Resolvable<boolean> = false;
	protected _embeds: Resolvable<boolean> = false;
	protected _htmlSource: Resolvable<boolean> = false;
	protected _extensions: string[] = ['link', 'underline', 'subscript', 'superscript', 'highlight', 'textAlign']; // Custom TipTap extensions enabled by default

	toolbarButtons(buttons: string[]): this {
		this._toolbarButtons = buttons;
		return this;
	}

	disableToolbarButtons(buttons: string[]): this {
		this._disabledButtons = buttons;
		return this;
	}

	fileAttachments(allow: Resolvable<boolean> = true): this {
		this._fileAttachments = allow;
		return this;
	}

	embeds(allow: Resolvable<boolean> = true): this {
		this._embeds = allow;
		return this;
	}

	/**
	 * Allow users to edit HTML source code directly
	 * Disabled by default
	 */
	htmlSource(allow: Resolvable<boolean> = true): this {
		this._htmlSource = allow;
		return this;
	}

	/**
	 * Enable additional TipTap extensions
	 * Examples: 'link', 'subscript', 'superscript', 'underline', 'textAlign', 'highlight'
	 */
	extensions(extensions: string[]): this {
		this._extensions = extensions;
		return this;
	}

	getToolbarButtons(): string[] {
		return this._toolbarButtons.filter(btn => !this._disabledButtons.includes(btn));
	}

	isFileAttachmentsAllowed(): boolean {
		return this.evaluate(this._fileAttachments);
	}

	isEmbedsAllowed(): boolean {
		return this.evaluate(this._embeds);
	}

	isHtmlSourceAllowed(): boolean {
		return this.evaluate(this._htmlSource);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();

		json.type = 'richEditor';
		json.toolbarButtons = this.getToolbarButtons();

		if (this.isFileAttachmentsAllowed()) {
			json.fileAttachments = true;
		}

		if (this.isEmbedsAllowed()) {
			json.embeds = true;
		}

		if (this.isHtmlSourceAllowed()) {
			json.htmlSource = true;
		}

		if (this._extensions.length > 0) {
			json.extensions = this._extensions;
		}

		const placeholder = (this as any).getPlaceholder?.();
		if (placeholder) {
			json.placeholder = placeholder;
		}

		const maxLength = (this as any).getMaxLength?.();
		if (maxLength !== undefined) {
			json.maxLength = maxLength;
		}

		return json;
	}
}

// Apply mixins
const RichEditorWithMixins = HasPlaceholder(CanBeLengthConstrained(BaseRichEditor));

export class RichEditor extends RichEditorWithMixins {
	static make(name: string): RichEditor {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}

export interface RichEditor {
	toolbarButtons(buttons: string[]): this;
	disableToolbarButtons(buttons: string[]): this;
	fileAttachments(allow?: Resolvable<boolean>): this;
	embeds(allow?: Resolvable<boolean>): this;
	htmlSource(allow?: Resolvable<boolean>): this;
	extensions(extensions: string[]): this;
	placeholder(text: Resolvable<string>): this;
	minLength(length: number | Resolvable<number>): this;
	maxLength(length: number | Resolvable<number>): this;
	length(length: number | Resolvable<number>): this;
}
