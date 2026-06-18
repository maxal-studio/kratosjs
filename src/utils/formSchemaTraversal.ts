import { SerializedForm, SerializedComponent } from '../formbuilder/types';

/**
 * The declarative children contract (see Component.toJSON):
 * - children live under `schema`
 * - `isLayout` marks pure layout containers (no value of their own)
 * - `childScope: 'array'` marks containers whose children are an item template
 *   (the value lives under the component's own name as an array, e.g. Repeater)
 *
 * These helpers are the single source of truth for "where do a component's
 * children live" on the backend. Any component (including plugin containers)
 * that follows the contract is traversed correctly with no type-specific code.
 */

/** Direct child components of a serialized node. */
export function getChildComponents(component: SerializedComponent): SerializedComponent[] {
	const schema = (component as any).schema;
	return Array.isArray(schema) ? (schema as SerializedComponent[]) : [];
}

/** Whether a node carries a form value of its own (vs. a pure layout container). */
export function isValueComponent(component: SerializedComponent): boolean {
	return Boolean(component.name) && (component as any).isLayout !== true;
}

/** Whether a node opens a new (array) value scope for its children, e.g. Repeater. */
export function isArrayScope(component: SerializedComponent): boolean {
	return (component as any).childScope === 'array';
}

/**
 * Traverse all components in a form schema and call the visitor for each component.
 */
export function traverseFormComponents(
	schema: SerializedForm,
	visitor: (component: SerializedComponent) => void,
): void {
	for (const component of (schema.components || []) as SerializedComponent[]) {
		traverseComponent(component, visitor);
	}
}

/**
 * Traverse a single component and all of its nested children, generically,
 * via the declarative `schema` children contract.
 */
export function traverseComponent(
	component: SerializedComponent,
	visitor: (component: SerializedComponent) => void,
): void {
	visitor(component);
	for (const child of getChildComponents(component)) {
		traverseComponent(child, visitor);
	}
}

/**
 * Collect the top-level (parent-scope) field names contributed by a component.
 * Layout containers contribute nothing themselves but recurse into children.
 * Array-scope containers (Repeater) contribute their own name and do NOT leak
 * their item-template field names into the parent scope.
 */
export function collectFieldNames(component: SerializedComponent, acc: string[]): void {
	if (isArrayScope(component)) {
		if (component.name) acc.push(component.name);
		return; // item-template fields belong to the array's own scope
	}

	if (isValueComponent(component)) {
		acc.push(component.name as string);
	}

	for (const child of getChildComponents(component)) {
		collectFieldNames(child, acc);
	}
}
