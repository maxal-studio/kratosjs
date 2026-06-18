import { SerializedColumn } from '../tablebuilder/types';

/**
 * Context passed to an exporter alongside the rows and columns.
 */
export interface ExportContext {
	resourceSlug: string;
	resourceLabel?: string;
}

/**
 * The artifact an exporter produces for download.
 */
export interface ExportResult {
	content: string | Buffer;
	contentType: string;
	filename: string;
}

/**
 * An exporter serializes table rows into a downloadable file for a given format.
 * Registered by plugins via `panel.registerExporter(format, exporter)` and invoked
 * by the core `POST /:resource/export` endpoint.
 */
export type Exporter = (rows: any[], columns: SerializedColumn[], ctx: ExportContext) => ExportResult;
