import type { KratosRequest, KratosRequestInit } from './types';
import { parseCookieHeader } from './cookies';

/**
 * Build the framework-neutral {@link KratosRequest} from an adapter-supplied init object.
 *
 * Core derives everything it can (path, cookies, case-insensitive header lookup,
 * media helpers bound to the panel) so adapters only map their native request's
 * primitive fields. Pipeline-populated fields (`authUser`, `panelResource`) start unset.
 */
export function buildKratosRequest(init: KratosRequestInit): KratosRequest {
	const headers: Record<string, string | string[] | undefined> = {};
	for (const [name, value] of Object.entries(init.headers)) {
		headers[name.toLowerCase()] = value;
	}

	const queryIndex = init.url.indexOf('?');
	const path = queryIndex === -1 ? init.url : init.url.slice(0, queryIndex);
	const panel = init.panel;

	const cookieHeader = headers['cookie'];

	return {
		method: init.method.toUpperCase(),
		path,
		url: init.url,
		protocol: init.protocol,
		host: init.host ?? (typeof headers['host'] === 'string' ? (headers['host'] as string) : undefined),
		ip: init.ip,
		params: init.params ?? {},
		query: init.query ?? {},
		body: init.body,
		headers,
		cookies: parseCookieHeader(Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader),
		header(name: string): string | undefined {
			const value = headers[name.toLowerCase()];
			if (Array.isArray(value)) {
				return value[0];
			}
			return value;
		},
		raw: init.raw,
		panel,
		authUser: undefined,
		panelResource: undefined,
		transformMediaFieldsForStorage: (data, formSchema) => panel.transformMediaFieldsForStorage(data, formSchema),
		formatMediaKey: (key, bucketName) => panel.formatMediaKey(key, bucketName),
		resolveMediaUrl: mediaValue => panel.resolveMediaUrl(mediaValue),
	};
}

/**
 * Parse a human-readable byte size ('50mb', '1gb', '512kb', or a plain number of bytes).
 * Used by adapters to honor {@link import('./types').AdapterInitContext.bodyLimit}.
 */
export function parseByteSize(size: string): number {
	const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(size.trim());
	if (!match) {
		throw new Error(`[kratosjs] Invalid byte size: "${size}"`);
	}
	const value = parseFloat(match[1]);
	const unit = (match[2] || 'b').toLowerCase();
	const factor = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }[unit]!;
	return Math.floor(value * factor);
}
