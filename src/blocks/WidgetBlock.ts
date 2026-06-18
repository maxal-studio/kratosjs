import { Block, SerializedBlock } from './Block';
import { Widget } from '../widgets/Widget';

export interface SerializedWidgetBlock extends SerializedBlock {
	type: 'widget';
	widget: {
		type: string;
		name: string;
		label?: string;
		icon?: string;
		color?: string;
		[key: string]: any;
	};
}

/**
 * Block that displays a widget
 */
export class WidgetBlock extends Block {
	protected blockType = 'widget' as const;
	private _widget: Widget;

	constructor(widget: Widget) {
		super();
		this._widget = widget;
	}

	/**
	 * Create a WidgetBlock
	 */
	static make(widget: Widget): WidgetBlock {
		return new WidgetBlock(widget);
	}

	/**
	 * Serialize block to JSON
	 */
	toJSON(): SerializedWidgetBlock {
		return {
			type: 'widget',
			widget: this._widget.toJSON(),
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
