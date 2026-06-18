import { apiGet, apiPost } from './http';

/**
 * Typed endpoints for the panel's resource API.
 * All functions take the panel apiBaseUrl (e.g. http://host/kratosjs/api) and a resource slug.
 */

export interface RecordEnvelope<T = any> {
	data: T;
	metadata?: { recordTitle?: string; refreshBadges?: boolean; [key: string]: any };
}

/** Normalize bare-record responses into the `{ data, metadata }` envelope. */
function toEnvelope<T = any>(result: any): RecordEnvelope<T> {
	if (result && typeof result === 'object' && 'data' in result) {
		return result as RecordEnvelope<T>;
	}
	return { data: result as T };
}

/** GET /:slug/:id */
export async function getRecord(apiBaseUrl: string, slug: string, id: string | number): Promise<RecordEnvelope> {
	return toEnvelope(await apiGet(`${apiBaseUrl}/${slug}/${id}`, apiBaseUrl));
}

/** POST /:slug */
export async function createRecord(apiBaseUrl: string, slug: string, payload: any): Promise<RecordEnvelope> {
	return toEnvelope(await apiPost(`${apiBaseUrl}/${slug}`, payload, apiBaseUrl));
}

/** POST /:slug/update/:id */
export async function updateRecord(
	apiBaseUrl: string,
	slug: string,
	id: string | number,
	payload: any,
): Promise<RecordEnvelope> {
	return toEnvelope(await apiPost(`${apiBaseUrl}/${slug}/update/${id}`, payload, apiBaseUrl));
}

/** POST /:slug/bulk-delete */
export function bulkDelete(
	apiBaseUrl: string,
	slug: string,
	ids: any[],
): Promise<{ deleted?: any[]; metadata?: { refreshBadges?: boolean }; [key: string]: any }> {
	return apiPost(`${apiBaseUrl}/${slug}/bulk-delete`, { ids }, apiBaseUrl);
}

/** GET /:slug/schema/form — returns the serialized form schema */
export async function getFormSchema(apiBaseUrl: string, slug: string): Promise<any> {
	const result = await apiGet<any>(`${apiBaseUrl}/${slug}/schema/form`, apiBaseUrl);
	return result?.schema || result;
}

/**
 * GET /:slug/schema/table — returns the serialized table schema with
 * the resource capability flags merged in (as TableRenderer expects).
 */
export async function getTableSchema(apiBaseUrl: string, slug: string): Promise<any> {
	const result = await apiGet<any>(`${apiBaseUrl}/${slug}/schema/table`, apiBaseUrl);
	return {
		...(result?.schema || result),
		canCreate: result?.canCreate,
		canEdit: result?.canEdit,
		canDelete: result?.canDelete,
		canView: result?.canView,
	};
}

/** GET /:slug/relations — relation metadata for the view modal */
export async function getRelations(apiBaseUrl: string, slug: string): Promise<any[]> {
	const result = await apiGet<any>(`${apiBaseUrl}/${slug}/relations`, apiBaseUrl);
	return result?.relations || [];
}

/** POST /:parentSlug/:parentId/relations/:relationName */
export async function createRelationRecord(
	apiBaseUrl: string,
	parentSlug: string,
	parentId: string | number,
	relationName: string,
	payload: any,
): Promise<RecordEnvelope> {
	return toEnvelope(
		await apiPost(`${apiBaseUrl}/${parentSlug}/${parentId}/relations/${relationName}`, payload, apiBaseUrl),
	);
}
