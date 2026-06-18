import { Component } from '../../Component';
import { Resolvable, SerializedComponent } from '../../types';

/**
 * Tab component — a single tab inside a {@link Tabs} container.
 *
 * Tabs are pure layout containers (`isLayout`, `childScope: 'inherit'`); their
 * nested fields are emitted under the canonical `schema` key by the base
 * Component.toJSON(), so the shared traversal walkers discover them generically.
 */
export class Tab extends Component {
	protected componentType: string = 'tab';
	protected _schema: Component[] = [];
	protected _icon?: Resolvable<string>;

	constructor(label?: Resolvable<string>) {
		super('tab');
		if (label !== undefined) {
			this.label(label);
		}
	}

	static make(label?: Resolvable<string>): Tab {
		const instance = new Tab(label);
		instance.configure();
		return instance;
	}

	schema(fields: Component[]): this {
		this._schema = fields;
		return this;
	}

	icon(icon: Resolvable<string>): this {
		this._icon = icon;
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

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.type = 'tab';

		// Tabs are addressed by index, not name
		delete (json as any).name;

		const icon = this._icon ? this.evaluate(this._icon) : undefined;
		if (icon) {
			json.icon = icon;
		}

		// Nested layout needs full record data for view mode
		(json as any).needsRecordData = true;

		return json;
	}
}
