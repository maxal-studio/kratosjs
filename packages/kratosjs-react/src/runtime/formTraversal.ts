import { SerializedComponent } from '@maxal_studio/kratosjs';

/**
 * Frontend implementation of the declarative children contract (mirrors
 * `src/utils/formSchemaTraversal`). The core package's
 * barrel pulls Node-only deps, so we share the *contract* (the serialized
 * shape), not the module:
 *   - children live under `schema`
 *   - `isLayout` marks pure layout containers (no value of their own)
 *   - `childScope: 'array'` marks item-template containers (Repeater)
 *
 * Any component (core or plugin) that follows the contract is traversed
 * correctly with no type-specific code.
 */

/** Direct child components of a node. */
export function getChildComponents(node: SerializedComponent): SerializedComponent[] {
	const schema = (node as any).schema;
	return Array.isArray(schema) ? (schema as SerializedComponent[]) : [];
}

/** A pure layout container (inherits parent value scope, holds no value of its own). */
export function isLayout(node: SerializedComponent): boolean {
	return (node as any).isLayout === true;
}

/** Children form an item template whose value lives under the node's own name (Repeater). */
export function isArrayScope(node: SerializedComponent): boolean {
	return (node as any).childScope === 'array';
}

/**
 * Depth-first predicate over a node and all of its descendants. Recursion stops
 * descending past array-scope containers (their item template is a separate
 * value scope) — the predicate still sees the container node itself.
 */
export function someComponent(node: SerializedComponent, predicate: (node: SerializedComponent) => boolean): boolean {
	if (predicate(node)) return true;
	if (isArrayScope(node)) return false;
	return getChildComponents(node).some(child => someComponent(child, predicate));
}
