import { Component } from '../../Component';
import { Resolvable, SerializedComponent } from '../../types';
import { HasDescription } from '../../concerns/HasDescription';
import { CanSpanColumns } from '../../concerns/CanSpanColumns';

/**
 * Section component
 * Used as a visual separator with optional heading and description
 */
class BaseSection extends Component {
	protected componentType: string = 'section';
	protected _heading: Resolvable<string> = '';
	protected _icon?: Resolvable<string>;
	protected _collapsible: Resolvable<boolean> = false;
	protected _collapsed: Resolvable<boolean> = true; // Default to collapsed
	protected _compact: Resolvable<boolean> = false;
	protected _aside: Resolvable<boolean> = false;
	protected _schema: Component[] = [];
	protected _columns: Resolvable<number | Record<string, number>> = 1;

	heading(text: Resolvable<string>): this {
		this._heading = text;
		return this;
	}

	icon(icon: Resolvable<string>): this {
		this._icon = icon;
		return this;
	}

	collapsible(condition: Resolvable<boolean> = true): this {
		this._collapsible = condition;
		return this;
	}

	collapsed(condition: Resolvable<boolean> = true): this {
		this._collapsed = condition;
		this.collapsible(true);
		return this;
	}

	compact(condition: Resolvable<boolean> = true): this {
		this._compact = condition;
		return this;
	}

	aside(condition: Resolvable<boolean> = true): this {
		this._aside = condition;
		return this;
	}

	/**
	 * Set the fields schema for this section
	 */
	schema(fields: Component[]): this {
		this._schema = fields;
		return this;
	}

	/**
	 * Set the number of columns in the section's grid
	 * @param columns - number or object with breakpoints
	 */
	columns(columns: number | Record<string, number>): this {
		this._columns = columns;
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

	getHeading(): string {
		return this.evaluate(this._heading);
	}

	getIcon(): string | undefined {
		return this._icon ? this.evaluate(this._icon) : undefined;
	}

	isCollapsible(): boolean {
		return this.evaluate(this._collapsible);
	}

	isCollapsed(): boolean {
		return this.evaluate(this._collapsed);
	}

	isCompact(): boolean {
		return this.evaluate(this._compact);
	}

	isAside(): boolean {
		return this.evaluate(this._aside);
	}

	getColumns(): number | Record<string, number> {
		return this.evaluate(this._columns);
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'section';

		// Sections don't have names, remove it
		delete (json as any).name;

		// Indicate that this layout component needs full record data
		// so that nested fields can access their values in view mode
		(json as any).needsRecordData = true;

		const heading = this.getHeading();
		if (heading) {
			json.heading = heading;
		}

		const icon = this.getIcon();
		if (icon) {
			json.icon = icon;
		}

		if (this.isCollapsible()) {
			json.collapsible = true;
		}

		json.collapsed = false;
		if (this.isCollapsed()) {
			json.collapsed = true;
		}

		if (this.isCompact()) {
			json.compact = true;
		}

		if (this.isAside()) {
			json.aside = true;
		}

		const description = (this as any).getDescription?.();
		if (description) {
			json.description = description;
		}

		// Add columns
		const columns = this.getColumns();
		if (columns && columns !== 1) {
			json.columns = columns;
		}

		// Add column span
		const columnSpan = (this as any).getColumnSpan?.();
		if (columnSpan) {
			json.columnSpan = columnSpan;
		}

		// Add column start
		const columnStart = (this as any).getColumnStart?.();
		if (columnStart) {
			json.columnStart = columnStart;
		}

		// `schema` (children) is emitted by the base Component.toJSON()

		return json;
	}
}

// Apply mixins
const SectionWithMixins = CanSpanColumns(HasDescription(BaseSection));

export class Section extends SectionWithMixins {
	constructor(name: string = '') {
		super(name || 'section');
	}

	// Override make to accept a name (for compatibility) or heading
	static make(nameOrHeading?: string): Section {
		const instance = new this('');
		instance.configure();
		if (nameOrHeading) {
			// Use it as heading (more common use case for Section)
			instance.heading(nameOrHeading);
		}
		return instance;
	}
}

export interface Section {
	heading(text: Resolvable<string>): this;
	icon(icon: Resolvable<string>): this;
	collapsible(condition?: Resolvable<boolean>): this;
	collapsed(condition?: Resolvable<boolean>): this;
	compact(condition?: Resolvable<boolean>): this;
	aside(condition?: Resolvable<boolean>): this;
	schema(fields: Component[]): this;
	columns(columns: number | Record<string, number>): this;
	description(text: Resolvable<string>): this;
	columnSpan(span: number | string | Record<string, number | string>): this;
	columnSpanFull(): this;
	columnStart(start: number | Record<string, number>): this;
}
