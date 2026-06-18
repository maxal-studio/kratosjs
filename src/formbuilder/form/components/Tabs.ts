import { Component } from '../../Component';
import { Resolvable, SerializedComponent } from '../../types';
import { HasDescription } from '../../concerns/HasDescription';
import { CanSpanColumns } from '../../concerns/CanSpanColumns';
import { Tab } from './Tab';

/**
 * Tab definition interface
 */
export interface TabDefinition {
	label: Resolvable<string>;
	icon?: Resolvable<string>;
	schema: Component[];
}

/**
 * Tabs component
 * Organizes form fields into tabbed interfaces
 */
class BaseTabs extends Component {
	protected componentType: string = 'tabs';
	protected _tabs: TabDefinition[] = [];
	protected _columns: Resolvable<number | Record<string, number>> = 1;
	protected _defaultTab: number = 0;

	/**
	 * Set the tabs for this component
	 */
	tabs(tabDefinitions: TabDefinition[]): this {
		this._tabs = tabDefinitions;
		return this;
	}

	/**
	 * Set the number of columns in the tabs' grid
	 * @param columns - number or object with breakpoints
	 */
	columns(columns: number | Record<string, number>): this {
		this._columns = columns;
		return this;
	}

	/**
	 * Set the default active tab index
	 */
	defaultTab(index: number): this {
		this._defaultTab = index;
		return this;
	}

	getTabs(): TabDefinition[] {
		return this._tabs;
	}

	/**
	 * Tab definitions are exposed to the core as {@link Tab} components, so the
	 * shared traversal discovers their nested fields generically (no special-casing).
	 */
	getChildComponents(): Component[] {
		return this._tabs.map(def => {
			const tab = Tab.make(def.label).schema(def.schema);
			if (def.icon !== undefined) {
				tab.icon(def.icon);
			}
			return tab;
		});
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

	getDefaultTab(): number {
		return this._defaultTab;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'tabs';

		// Tabs don't have names, remove it
		delete (json as any).name;

		// Indicate that this layout component needs full record data
		// so that nested fields can access their values in view mode
		(json as any).needsRecordData = true;

		// Tab children (each a `tab` component) are emitted under `schema` by the base toJSON()

		// Add columns
		const columns = this.getColumns();
		if (columns && columns !== 1) {
			json.columns = columns;
		}

		// Add default tab
		if (this._defaultTab !== 0) {
			json.defaultTab = this._defaultTab;
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

		// Add description if present
		const description = (this as any).getDescription?.();
		if (description) {
			json.description = description;
		}

		return json;
	}
}

// Apply mixins
const TabsWithMixins = CanSpanColumns(HasDescription(BaseTabs));

export class Tabs extends TabsWithMixins {
	constructor(name: string = '') {
		super(name || 'tabs');
	}

	// Override make to accept optional name
	static make(name?: string): Tabs {
		const instance = new this(name || '');
		instance.configure();
		return instance;
	}
}

export interface Tabs {
	tabs(tabDefinitions: TabDefinition[]): this;
	columns(columns: number | Record<string, number>): this;
	defaultTab(index: number): this;
	description(text: Resolvable<string>): this;
	columnSpan(span: number | string | Record<string, number | string>): this;
	columnSpanFull(): this;
	columnStart(start: number | Record<string, number>): this;
}
