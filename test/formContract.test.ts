import { describe, expect, it } from 'vitest';
import {
	FormBuilder,
	TextInput,
	Section,
	Group,
	Tabs,
	Repeater,
	Component,
	SchemaValidator,
	collectFieldNames,
	getChildComponents,
} from '../src';
import { SerializedComponent } from '../src/formbuilder/types';

/** A synthetic plugin container — overrides only the declarative contract. */
class Fieldset extends Component {
	protected componentType = 'fieldset';
	private _children: Component[] = [];
	setChildren(children: Component[]): this {
		this._children = children;
		return this;
	}
	getChildComponents(): Component[] {
		return this._children;
	}
	isLayoutComponent(): boolean {
		return true;
	}
	getChildScope(): 'inherit' | 'array' | undefined {
		return 'inherit';
	}
}

function buildForm() {
	return FormBuilder.make()
		.schema([
			Tabs.make('main').tabs([
				{
					label: 'General',
					icon: 'Info',
					schema: [
						TextInput.make('title').required(),
						Group.make('g').schema([TextInput.make('slug'), TextInput.make('nickname')]),
					],
				},
				{
					label: 'Advanced',
					schema: [
						Section.make('s').schema([TextInput.make('notes')]),
						Repeater.make('specs').schema([TextInput.make('key'), TextInput.make('value')]),
						new Fieldset('fs').setChildren([TextInput.make('pluginField')]),
					],
				},
			]),
		])
		.toJSON();
}

describe('declarative children contract — serialization', () => {
	const tabs = buildForm().components[0] as SerializedComponent;

	it('Tabs serializes children under `schema` as tab nodes (no `tabs` key)', () => {
		expect((tabs as any).tabs).toBeUndefined();
		expect(tabs.isLayout).toBe(true);
		expect(tabs.childScope).toBe('inherit');
		expect(Array.isArray(tabs.schema)).toBe(true);
		expect(tabs.schema!.every(t => t.type === 'tab' && t.isLayout === true)).toBe(true);
		expect(tabs.schema![0].label).toBe('General');
		expect(tabs.schema![0].icon).toBe('Info');
	});

	it('Repeater marks array scope; plugin container marks layout', () => {
		const advanced = tabs.schema![1];
		const repeater = getChildComponents(advanced).find(c => c.name === 'specs')!;
		const fieldset = getChildComponents(advanced).find(c => c.type === 'fieldset')!;
		expect(repeater.childScope).toBe('array');
		expect(repeater.isLayout).toBeUndefined();
		expect(fieldset.isLayout).toBe(true);
		expect(getChildComponents(fieldset).map(c => c.name)).toEqual(['pluginField']);
	});
});

describe('collectFieldNames', () => {
	it('collects nested field names, treats repeater as a single field, and finds plugin-container fields', () => {
		const form = buildForm();
		const names: string[] = [];
		for (const c of form.components) collectFieldNames(c as SerializedComponent, names);

		// nested through tabs / group / section / plugin container
		expect(names).toEqual(expect.arrayContaining(['title', 'slug', 'nickname', 'notes', 'specs', 'pluginField']));
		// repeater item-template fields must NOT leak into the parent scope
		expect(names).not.toContain('key');
		expect(names).not.toContain('value');
	});
});

describe('SchemaValidator with the generic contract', () => {
	it('keeps nested + plugin-container fields when filtering', () => {
		const schema = buildForm();
		const filtered = SchemaValidator.filterFields(schema, {
			title: 'T',
			slug: 's',
			notes: 'n',
			pluginField: 'p',
			specs: [{ key: 'a', value: 'b' }],
			rogue: 'drop me',
		});
		expect(filtered).toMatchObject({ title: 'T', slug: 's', notes: 'n', pluginField: 'p' });
		expect(filtered.specs).toEqual([{ key: 'a', value: 'b' }]);
		expect(filtered.rogue).toBeUndefined();
	});

	it('reaches a required field nested inside tabs (generic traversal)', () => {
		// `validateComponentRequired` enforces the `required: true` flag; this asserts the
		// generic walker descends through tabs → tab → field to find it.
		const schema: any = {
			type: 'form',
			components: [
				{
					type: 'tabs',
					isLayout: true,
					childScope: 'inherit',
					schema: [
						{
							type: 'tab',
							isLayout: true,
							childScope: 'inherit',
							label: 'General',
							schema: [{ type: 'text-input', name: 'title', label: 'Title', required: true }],
						},
					],
				},
			],
		};
		expect(() => SchemaValidator.validateCreate(schema, { other: 'x' })).toThrowError(/title/i);
		expect(() => SchemaValidator.validateCreate(schema, { title: 'ok' })).not.toThrow();
	});
});
