import { Utils } from '@mikro-orm/core';
import type { Panel } from '../Panel';
import type { ResourceClass } from '../BaseResource';
import type { SerializedForm } from '../formbuilder/types';
import { traverseFormComponents } from '../utils/formSchemaTraversal';

const RELATION_KINDS = new Set(['m:1', '1:1', 'm:n', '1:m']);

/**
 * Build a map of MikroORM entity name -> panel resource slug.
 */
export function buildEntityResourceSlugMap(panel: Panel): Map<string, string> {
	const map = new Map<string, string>();
	for (const [slug, registered] of panel.getResources()) {
		const entity = registered.resourceClass.getEntity();
		if (entity) {
			map.set(Utils.className(entity), slug);
		}
	}
	return map;
}

/**
 * Resolve missing `relationship.resource` slugs on select fields by inspecting
 * the parent resource's MikroORM entity metadata.
 *
 * Without this, the frontend falls back to the relation property name (e.g. `post`)
 * instead of the actual resource slug (e.g. `posts`), causing 404s on /:resource/list.
 */
export function enrichFormSchemaRelationships(
	panel: Panel,
	resourceClass: ResourceClass,
	schema: SerializedForm,
): SerializedForm {
	let orm;
	try {
		orm = panel.getOrm();
	} catch {
		return schema;
	}

	const entity = resourceClass.getEntity();
	if (!entity) return schema;

	let meta;
	try {
		meta = orm.getMetadata().get(entity);
	} catch {
		return schema;
	}

	const slugMap = buildEntityResourceSlugMap(panel);

	traverseFormComponents(schema, component => {
		if (component.type !== 'select') return;

		const relationship = component.relationship as
			| { name: string; titleAttribute: string; resource?: string }
			| undefined;
		if (!relationship || relationship.resource) return;

		const prop = meta.properties[relationship.name];
		if (!prop || !RELATION_KINDS.has(prop.kind as string)) return;

		// v7 resolves relation targets to metadata; className is the slug-map key.
		const targetEntity =
			prop.targetMeta?.className ??
			(typeof prop.entity === 'string' ? prop.entity : prop.entity ? Utils.className(prop.entity) : null);
		if (!targetEntity) return;

		const slug = slugMap.get(targetEntity);
		if (slug) {
			relationship.resource = slug;
		}
	});

	return schema;
}
