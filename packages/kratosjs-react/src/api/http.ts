import { authenticatedFetch } from './authenticatedFetch';

/**
 * Typed error thrown by apiFetch for any non-2xx response.
 * Carries the HTTP status and whatever the server put in the body so
 * callers can map field-level validation errors or show the message.
 */
export class ApiError extends Error {
	readonly status: number;
	readonly details?: unknown;

	constructor(message: string, status: number, details?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.details = details;
	}

	get isUnauthorized(): boolean {
		return this.status === 401;
	}
}

export interface ApiFetchOptions extends RequestInit {
	/** Base URL of the panel API, used for token refresh on 401 */
	apiBaseUrl: string;
}

/**
 * JSON fetch with auth + token refresh + uniform error handling.
 * Throws ApiError on any non-ok response, preserving the server message.
 */
export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions): Promise<T> {
	const { apiBaseUrl, ...init } = options;
	const response = await authenticatedFetch(url, init, apiBaseUrl);

	let body: any = null;
	const text = await response.text();
	if (text) {
		try {
			body = JSON.parse(text);
		} catch {
			body = text;
		}
	}

	if (!response.ok) {
		const message =
			response.status === 401
				? 'Unauthorized - Please login again'
				: (body && typeof body === 'object' && (body.message || body.error)) ||
					response.statusText ||
					`Request failed with status ${response.status}`;
		throw new ApiError(message, response.status, body);
	}

	return body as T;
}

/** Convenience JSON POST */
export function apiPost<T = unknown>(url: string, payload: unknown, apiBaseUrl: string): Promise<T> {
	return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(payload), apiBaseUrl });
}

/** Convenience JSON GET */
export function apiGet<T = unknown>(url: string, apiBaseUrl: string): Promise<T> {
	return apiFetch<T>(url, { apiBaseUrl });
}
