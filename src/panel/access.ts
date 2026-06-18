import type { Panel } from '../Panel';
import { RegisteredResource } from './types';
import { AuthUser } from '../auth/types';
import { ResourceCapabilities } from './PanelHooks';

/**
 * Get filtered capabilities for a resource.
 * Combines the resource-level flags with the plugin capabilities filter hook.
 */
export async function getFilteredCapabilities(
	panel: Panel,
	resource: RegisteredResource,
	user?: AuthUser,
): Promise<ResourceCapabilities> {
	// Get base capabilities from resource
	let capabilities: ResourceCapabilities = {
		canCreate: resource.resourceClass.getCanCreate(),
		canEdit: resource.resourceClass.getCanEdit(),
		canDelete: resource.resourceClass.getCanDelete(),
		canView: resource.resourceClass.getCanView(),
	};

	// Apply capabilities filter hook if registered (allows plugins to override)
	if (panel.hooks.capabilitiesFilter) {
		capabilities = await panel.hooks.capabilitiesFilter(capabilities, resource.resourceClass.getSlug(), user);
	}

	return capabilities;
}

/**
 * Get filtered capabilities for a resource by slug.
 * Used when we need capabilities for a resource that's not the current one (e.g., relations).
 */
export async function getFilteredCapabilitiesBySlug(
	panel: Panel,
	resourceSlug: string,
	user?: AuthUser,
): Promise<ResourceCapabilities | null> {
	const registered = Array.from(panel.getResources().values()).find(
		(r: RegisteredResource) => r.resourceClass.getSlug() === resourceSlug,
	);
	if (!registered) {
		return null;
	}

	return getFilteredCapabilities(panel, registered, user);
}

/**
 * Check if an operation is allowed for a resource.
 * Combines resource-level flags (canCreate/canEdit/canDelete/canView) with plugin permissions.
 */
export async function checkOperationAccess(
	panel: Panel,
	resource: RegisteredResource,
	operation: 'create' | 'read' | 'update' | 'delete',
	user?: AuthUser,
): Promise<{ allowed: boolean; message: string }> {
	const capabilities = await getFilteredCapabilities(panel, resource, user);

	let allowed = false;
	switch (operation) {
		case 'create':
			allowed = capabilities.canCreate;
			break;
		case 'read':
			allowed = capabilities.canView;
			break;
		case 'update':
			allowed = capabilities.canEdit;
			break;
		case 'delete':
			allowed = capabilities.canDelete;
			break;
	}

	if (!allowed) {
		const operationName = operation === 'read' ? 'view' : operation;
		return {
			allowed: false,
			message: `${operationName.charAt(0).toUpperCase() + operationName.slice(1)} operation is disabled for this resource`,
		};
	}

	return { allowed: true, message: '' };
}
