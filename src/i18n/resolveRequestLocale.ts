// Resolve the active locale for a request.
//
// Precedence: `?locale` query → `X-KratosJs-Locale` header (the client's current
// UI locale) → `Accept-Language` → panel default. Only locales the panel actually
// registered are eligible; a regional subtag (`sq-AL`) matches its base (`sq`).
//
// Browser-safe (no `node:*`).

export interface LocaleSources {
	query?: Record<string, unknown>;
	headers?: Record<string, string | string[] | undefined>;
}

/** Parse an `Accept-Language` header into base subtags ordered by q-value. */
export function parseAcceptLanguage(header?: string): string[] {
	if (!header) return [];
	return header
		.split(',')
		.map(part => {
			const [tag, ...params] = part.trim().split(';');
			const q = params.find(p => p.trim().startsWith('q='));
			const quality = q ? parseFloat(q.split('=')[1]) : 1;
			return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 1 };
		})
		.filter(x => x.tag && x.tag !== '*')
		.sort((a, b) => b.quality - a.quality)
		.map(x => x.tag);
}

/** Normalize a header value that may be a string or string[]. */
function headerValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0];
	return value;
}

/**
 * Match a requested tag against the registered locales: exact match first, then
 * base-subtag match (`sq-AL` → `sq`), case-insensitive. Returns the registered
 * locale (preserving its original casing) or `undefined`.
 */
function matchLocale(requested: string, registered: string[]): string | undefined {
	const lower = requested.toLowerCase();
	const exact = registered.find(l => l.toLowerCase() === lower);
	if (exact) return exact;
	const base = lower.split('-')[0];
	return registered.find(l => l.toLowerCase().split('-')[0] === base);
}

/**
 * Resolve the active locale from request sources, constrained to `registered`
 * locales, falling back to `defaultLocale`.
 */
export function resolveRequestLocale(sources: LocaleSources, registered: string[], defaultLocale: string): string {
	const candidates: string[] = [];

	// 1. Explicit ?locale query param.
	const queryLocale = sources.query?.locale;
	if (typeof queryLocale === 'string') candidates.push(queryLocale);

	// 2. X-KratosJs-Locale header (the client's chosen UI locale).
	const headerLocale = headerValue(sources.headers?.['x-kratosjs-locale']);
	if (headerLocale) candidates.push(headerLocale);

	// 3. Accept-Language, ordered by quality.
	candidates.push(...parseAcceptLanguage(headerValue(sources.headers?.['accept-language'])));

	for (const candidate of candidates) {
		const matched = matchLocale(candidate, registered);
		if (matched) return matched;
	}

	return defaultLocale;
}
