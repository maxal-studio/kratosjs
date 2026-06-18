import { TextColumn } from './TextColumn';

/**
 * BadgeColumn is just a TextColumn with badge() pre-applied
 */
export class BadgeColumn extends TextColumn {
	constructor(name: string) {
		super(name);
		this.badge(true);
	}

	static make(name: string): BadgeColumn {
		const column = new BadgeColumn(name);
		column.configure();
		return column;
	}
}
