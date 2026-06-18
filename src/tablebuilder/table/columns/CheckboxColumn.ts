import { Column } from '../../Column';
import { SerializedColumn } from '../../types';
import { CanUpdateState } from '../../concerns/CanUpdateState';

/**
 * CheckboxColumn for inline checkbox editing
 */
class BaseCheckboxColumn extends Column {
	protected columnType = 'checkbox';

	toJSON(): SerializedColumn {
		const json = super.toJSON();

		// Add state update callbacks
		const beforeStateUpdated = (this as any).getBeforeStateUpdated?.();
		if (beforeStateUpdated) {
			json.beforeStateUpdated = beforeStateUpdated.toString();
		}

		const afterStateUpdated = (this as any).getAfterStateUpdated?.();
		if (afterStateUpdated) {
			json.afterStateUpdated = afterStateUpdated.toString();
		}

		return json;
	}
}

// Apply editable column mixins
const CheckboxColumnWithMixins = CanUpdateState(BaseCheckboxColumn);

export class CheckboxColumn extends CheckboxColumnWithMixins {
	static make(name: string): CheckboxColumn {
		const column = new CheckboxColumn(name);
		column.configure();
		return column;
	}
}
