import { authenticatedFetch } from './authenticatedFetch';

export interface ExportOptions {
	/** Export format, e.g. 'csv'. */
	format: string;
	/** Originating action name (used for server-side per-action authorization). */
	action?: string;
	/** Current table query (search/filters/sort) — exports all matching rows. */
	query?: Record<string, any>;
	/** Specific record ids — exports only these (bulk "export selected"). */
	recordIds?: any[];
}

/**
 * POST to a resource's `/export` endpoint and trigger a browser download of the
 * returned file. Used by header/bulk actions marked with `exportsTo(format)`.
 *
 * @param resourceUrl - The resource endpoint (e.g. `${apiBaseUrl}/users`)
 * @param apiBaseUrl - Panel API base (for token refresh)
 */
export async function downloadExport(resourceUrl: string, apiBaseUrl: string, options: ExportOptions): Promise<void> {
	const { format, action, query, recordIds } = options;
	const url = `${resourceUrl.replace(/\/$/, '')}/export`;

	const body: Record<string, any> = { format, ...(query || {}) };
	if (action) {
		body.action = action;
	}
	if (recordIds && recordIds.length > 0) {
		body.recordIds = recordIds;
	}

	const response = await authenticatedFetch(url, { method: 'POST', body: JSON.stringify(body) }, apiBaseUrl);

	if (!response.ok) {
		let message = `Export failed (${response.status})`;
		try {
			const errorBody = await response.json();
			message = errorBody.message || message;
		} catch {
			// response had no JSON body
		}
		throw new Error(message);
	}

	const blob = await response.blob();
	const filename = parseContentDispositionFilename(response.headers.get('Content-Disposition')) || `export.${format}`;
	triggerBrowserDownload(blob, filename);
}

function parseContentDispositionFilename(header: string | null): string | undefined {
	if (!header) return undefined;
	const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(header);
	return match ? decodeURIComponent(match[1]) : undefined;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
	const objectUrl = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = objectUrl;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(objectUrl);
}
