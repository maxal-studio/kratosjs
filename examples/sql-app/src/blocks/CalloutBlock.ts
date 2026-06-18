import { Block, type SerializedBlock } from '@maxal_studio/kratosjs';

type CalloutTone = 'info' | 'success' | 'warning';

/**
 * App-level custom page block — no plugin required.
 *
 * The backend only describes the block: it sets a `blockType` ('callout') and
 * serializes its extra props (`message`, `tone`). The matching React component is
 * registered in the admin client via mountAdminPanel({ blocks: { callout: ... } }).
 */
export class CalloutBlock extends Block {
	protected blockType = 'callout' as const;
	private _message = '';
	private _tone: CalloutTone = 'info';

	static make(): CalloutBlock {
		return new CalloutBlock();
	}

	message(text: string): this {
		this._message = text;
		return this;
	}

	tone(tone: CalloutTone): this {
		this._tone = tone;
		return this;
	}

	toJSON(): SerializedBlock {
		return {
			type: 'callout',
			message: this._message,
			tone: this._tone,
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
