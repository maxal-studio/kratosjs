import type { Panel } from '../Panel';
import { PanelMetadata } from './types';
import { AuthUser } from '../auth/types';

/**
 * Build panel metadata for frontend consumption.
 * Hidden resources/pages keep their hidden flag; excluded ones are omitted entirely.
 * The result can be filtered by the registered metadata filter hook.
 */
export function buildPanelMetadata(panel: Panel, user?: AuthUser): PanelMetadata | Promise<PanelMetadata> {
	const resources: PanelMetadata['resources'] = [];
	const pages: PanelMetadata['pages'] = [];
	let globalSearchAvailable = false;

	for (const [slug, registered] of panel.getResources()) {
		// Skip excluded resources
		if (registered.resourceClass.excluded) {
			continue;
		}

		// Check if this resource has globally searchable attributes
		const searchableFields = registered.resourceClass.getGloballySearchableAttributes();
		if (searchableFields && searchableFields.length > 0) {
			globalSearchAvailable = true;
		}

		resources.push({
			slug,
			label: registered.resourceClass.getLabel(),
			pluralLabel: registered.resourceClass.getPluralLabel(),
			icon: registered.resourceClass.getIcon(),
			navigationGroup: registered.resourceClass.getNavigationGroup(),
			navigationSort: registered.resourceClass.getNavigationSort(),
			hasForm: registered.resourceClass.hasForm(),
			hasTable: registered.resourceClass.hasTable(),
			hasActions: registered.resourceClass.hasActions(),
			hasRelations: registered.resourceClass.hasRelations(),
			hidden: registered.resourceClass.hidden,
		});
	}

	resources.sort(byNavigationSortThenLabel);

	// Add pages to metadata
	for (const [slug, PageClass] of panel.getPages()) {
		// Skip excluded pages
		if (PageClass.excluded) {
			continue;
		}

		pages.push({
			slug,
			label: PageClass.label,
			icon: PageClass.icon,
			navigationGroup: PageClass.navigationGroup,
			navigationSort: PageClass.navigationSort,
			hidden: PageClass.hidden,
		});
	}

	pages.sort(byNavigationSortThenLabel);

	// Custom component type names registered by plugins. The matching React
	// components are bundled into the app's admin client via plugin client
	// manifests, so the metadata only carries the names (informational).
	const components = panel.getCustomComponents();
	const customBlocks = [...components.blocks];
	const customFields = [...components.fields];
	const customColumns = [...components.columns];
	const customWidgets = [...components.widgets];

	const metadata: PanelMetadata = {
		id: panel.getId(),
		...(panel.getTitle() ? { title: panel.getTitle() } : {}),
		...(panel.getIcon() ? { icon: panel.getIcon() } : {}),
		...(panel.getFavicon() ? { favicon: panel.getFavicon() } : {}),
		basePath: panel.getBasePath(),
		resources,
		pages,
		globalSearchAvailable,
		...(customBlocks.length > 0 ? { customBlocks } : {}),
		...(customFields.length > 0 ? { customFields } : {}),
		...(customColumns.length > 0 ? { customColumns } : {}),
		...(customWidgets.length > 0 ? { customWidgets } : {}),
	};

	// Apply metadata filter hook if registered
	if (panel.hooks.metadataFilter) {
		return panel.hooks.metadataFilter(metadata, user);
	}

	return metadata;
}

/**
 * Get navigation badge values for all resources and pages (same visibility as metadata).
 * Used by GET /meta/badges for initial load and refresh.
 */
export async function buildPanelBadges(
	panel: Panel,
	user?: AuthUser,
): Promise<{
	resources: Record<string, { value: string | number | null; color?: string } | null>;
	pages: Record<string, { value: string | number | null; color?: string } | null>;
}> {
	const metadata = await Promise.resolve(buildPanelMetadata(panel, user));
	const resources: Record<string, { value: string | number | null; color?: string } | null> = {};
	const pages: Record<string, { value: string | number | null; color?: string } | null> = {};

	const resourcePromises = metadata.resources.map(async r => {
		const registered = panel.getResources().get(r.slug);
		if (!registered || typeof registered.resourceClass.getNavigationBadge !== 'function') {
			return [r.slug, null] as const;
		}
		const result = await registered.resourceClass.getNavigationBadge!();
		if (result == null) return [r.slug, null] as const;
		return [r.slug, { value: result.value, color: result.color }] as const;
	});

	const pagePromises = metadata.pages.map(async p => {
		const PageClass = panel.getPages().get(p.slug);
		if (!PageClass || typeof (PageClass as any).getNavigationBadge !== 'function') {
			return [p.slug, null] as const;
		}
		const result = await (PageClass as any).getNavigationBadge();
		if (result == null) return [p.slug, null] as const;
		return [p.slug, { value: result.value, color: result.color }] as const;
	});

	const resourceResults = await Promise.all(resourcePromises);
	const pageResults = await Promise.all(pagePromises);

	resourceResults.forEach(([slug, entry]) => {
		resources[slug] = entry;
	});
	pageResults.forEach(([slug, entry]) => {
		pages[slug] = entry;
	});

	return { resources, pages };
}

function byNavigationSortThenLabel(
	a: { navigationSort?: number; label: string },
	b: { navigationSort?: number; label: string },
): number {
	if (a.navigationSort !== undefined && b.navigationSort !== undefined) {
		return a.navigationSort - b.navigationSort;
	}
	if (a.navigationSort !== undefined) return -1;
	if (b.navigationSort !== undefined) return 1;
	return a.label.localeCompare(b.label);
}
