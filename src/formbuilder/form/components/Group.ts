import { Component } from '../../Component';
import { Resolvable, SerializedComponent } from '../../types';
import { HasDescription } from '../../concerns/HasDescription';

/**
 * Group component
 * Groups multiple fields together, optionally with a label and description
 */
class BaseGroup extends Component {
	protected componentType: string = 'group';
	protected _schema: Component[] = [];
	protected _columns: Resolvable<number | Record<string, number>> = 1;
	protected _columnSpan: Record<string, Resolvable<number | string>> | null = null;
	protected _columnStart: Record<string, number> | null = null;

	/**
	 * Set the fields schema for this group
	 */
	schema(fields: Component[]): this {
		this._schema = fields;
		return this;
	}

	/**
	 * Set the number of columns in the group's grid
	 * @param columns - number or object with breakpoints
	 */
	columns(columns: number | Record<string, number>): this {
		this._columns = columns;
		return this;
	}

	/**
	 * Set the column span for this group
	 */
	columnSpan(span: number | string | Record<string, number | string>): this {
		if (typeof span === 'number' || typeof span === 'string') {
			this._columnSpan = {
				default: 1,
				lg: span,
			};
		} else {
			this._columnSpan = {
				default: 1,
				...span,
			};
		}
		return this;
	}

	/**
	 * Make the group span the full width
	 */
	columnSpanFull(): this {
		this._columnSpan = {
			default: 'full',
		};
		return this;
	}

	/**
	 * Set which column to start at
	 */
	columnStart(start: number | Record<string, number>): this {
		if (typeof start === 'number') {
			this._columnStart = {
				lg: start,
			};
		} else {
			this._columnStart = start;
		}
		return this;
	}

	getSchema(): Component[] {
		return this._schema;
	}

	getChildComponents(): Component[] {
		return this._schema;
	}

	isLayoutComponent(): boolean {
		return true;
	}

	getChildScope(): 'inherit' | 'array' | undefined {
		return 'inherit';
	}

	getColumns(): number | Record<string, number> {
		return this.evaluate(this._columns);
	}

	getColumnSpan(): Record<string, number | string> | null {
		if (!this._columnSpan) return null;

		const evaluated: Record<string, number | string> = {};
		for (const key in this._columnSpan) {
			evaluated[key] = this.evaluate(this._columnSpan[key]);
		}
		return evaluated;
	}

	getColumnStart(): Record<string, number> | null {
		if (!this._columnStart) return null;

		const evaluated: Record<string, number> = {};
		for (const key in this._columnStart) {
			evaluated[key] = this._columnStart[key];
		}
		return evaluated;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'group';

		// Groups don't have names, remove it
		delete (json as any).name;

		// Indicate that this layout component needs full record data
		// so that nested fields can access their values in view mode
		(json as any).needsRecordData = true;

		// `schema` (children) is emitted by the base Component.toJSON()

		// Add columns
		const columns = this.getColumns();
		if (columns && columns !== 1) {
			json.columns = columns;
		}

		// Add column span
		const columnSpan = this.getColumnSpan();
		if (columnSpan) {
			json.columnSpan = columnSpan;
		}

		// Add column start
		const columnStart = this.getColumnStart();
		if (columnStart) {
			json.columnStart = columnStart;
		}

		// Add description if present
		const description = (this as any).getDescription?.();
		if (description) {
			json.description = description;
		}

		return json;
	}
}

// Apply mixins
const GroupWithMixins = HasDescription(BaseGroup);

export class Group extends GroupWithMixins {
	constructor(name: string = '') {
		super(name || 'group');
	}

	// Override make to accept either a name (for compatibility) or fields
	static make(fieldsOrName?: Component[] | string): Group {
		let instance: Group;
		if (typeof fieldsOrName === 'string') {
			// Called with a name string (for compatibility with Component.make signature)
			instance = new this(fieldsOrName);
		} else {
			// Called with fields array (our preferred usage)
			instance = new this('');
			if (fieldsOrName) {
				instance.schema(fieldsOrName);
			}
		}
		instance.configure();
		return instance;
	}
}

export interface Group {
	schema(fields: Component[]): this;
	columns(columns: number | Record<string, number>): this;
	columnSpan(span: number | string | Record<string, number | string>): this;
	columnSpanFull(): this;
	columnStart(start: number | Record<string, number>): this;
	description(text: Resolvable<string>): this;
}
