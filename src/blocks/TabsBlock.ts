import { Block, SerializedBlock } from './Block';

export interface SerializedTab {
	label: string;
	icon?: string;
	blocks: SerializedBlock[];
}

export interface SerializedTabsBlock extends SerializedBlock {
	type: 'tabs';
	tabs: SerializedTab[];
	defaultTab?: number;
}

/**
 * Block that displays tabs, each containing multiple blocks
 */
export class TabsBlock extends Block {
	protected blockType = 'tabs' as const;
	private _tabs: Array<{
		label: string;
		icon?: string;
		blocks: Block[];
	}> = [];
	private _defaultTab?: number;

	/**
	 * Add a tab
	 */
	tab(label: string, blocks: Block[], icon?: string): this {
		this._tabs.push({ label, icon, blocks });
		return this;
	}

	/**
	 * Set default tab index (0-based)
	 */
	defaultTab(index: number): this {
		this._defaultTab = index;
		return this;
	}

	/**
	 * Create a TabsBlock
	 */
	static make(): TabsBlock {
		return new TabsBlock();
	}

	/**
	 * Serialize block to JSON
	 */
	toJSON(): SerializedTabsBlock {
		return {
			type: 'tabs',
			tabs: this._tabs.map(tab => ({
				label: tab.label,
				icon: tab.icon,
				blocks: tab.blocks.map(block => block.toJSON()),
			})),
			defaultTab: this._defaultTab,
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
