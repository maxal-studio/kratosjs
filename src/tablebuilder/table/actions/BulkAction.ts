import { Action } from './Action';
import { SerializedAction } from '../../types';

export type BulkActionHandler = (
	rows: any[],
) => Promise<{ redirect?: string; success: boolean; message?: string; data?: any }>;
export type BulkActionCallback = (selectedRecords: any[]) => void | Promise<void>;

/**
 * BulkAction for actions on multiple selected rows
 */
export class BulkAction extends Action {
	protected _deselectRecordsAfterCompletion: boolean = true;

	/**
	 * Deselect records after completion
	 */
	deselectRecordsAfterCompletion(condition: boolean = true): this {
		this._deselectRecordsAfterCompletion = condition;
		return this;
	}

	shouldDeselectRecordsAfterCompletion(): boolean {
		return this._deselectRecordsAfterCompletion;
	}

	toJSON(): SerializedAction {
		return {
			...super.toJSON(),
			type: 'bulk-action',
			deselectAfterCompletion: this._deselectRecordsAfterCompletion,
		};
	}

	static make(name: string): BulkAction {
		return new BulkAction(name);
	}
}
