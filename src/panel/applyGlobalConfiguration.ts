import { FormBuilder } from '../formbuilder/form/FormBuilder';
import { Field } from '../formbuilder/form/Field';
import { Component } from '../formbuilder/Component';
import { TableBuilder } from '../tablebuilder/table/TableBuilder';
import { Column } from '../tablebuilder/Column';
import { Action } from '../tablebuilder/table/actions/Action';

/**
 * Apply every builder family's registered `configureUsing` callbacks to a
 * resource's fully-chained form and table builders, in place, before they are
 * serialized. This is the single point where plugin-registered global
 * configuration is woven into per-resource schemas.
 *
 * @see makeConfigurable / `*.configureUsing()`
 */
export function applyGlobalConfiguration(formBuilder: FormBuilder, tableBuilder: TableBuilder): void {
	// Containers first, so callbacks that inject columns/actions run before the
	// per-leaf callbacks below see the resulting collections.
	FormBuilder.applyConfiguration(formBuilder);
	TableBuilder.applyConfiguration(tableBuilder);

	for (const column of tableBuilder.getColumns()) {
		Column.applyConfiguration(column as unknown as Column);
	}

	for (const action of [
		...tableBuilder.getActions(),
		...tableBuilder.getBulkActions(),
		...tableBuilder.getHeaderActions(),
	]) {
		Action.applyConfiguration(action);
	}

	walkFormComponents(formBuilder.getComponents());
}

/**
 * Recurse through the component tree applying field configuration to each node,
 * using the declarative `getChildComponents()` contract so any container
 * (including plugin containers) is traversed without type-specific code.
 */
function walkFormComponents(components: Component[]): void {
	for (const component of components) {
		Field.applyConfiguration(component as unknown as Field);
		walkFormComponents(component.getChildComponents());
	}
}
