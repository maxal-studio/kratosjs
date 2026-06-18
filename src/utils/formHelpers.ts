/**
 * Form Helper Functions
 * Utilities for working with form schemas and field configurations
 */

/**
 * Find a field config by name in nested form components
 */
export function findFieldConfigByName(fieldName: string, components: any[]): any {
	for (const component of components) {
		if (component.name === fieldName) {
			return component;
		}
		if (component.schema && Array.isArray(component.schema)) {
			const found = findFieldConfigByName(fieldName, component.schema);
			if (found) return found;
		}
	}
	return null;
}
