import type { PageComponent, PageResolver } from './pageResolver';
import type { ViewPage } from './protocol';
import {
	CSRF_COOKIE,
	CSRF_HEADER,
	VIEW_COMPONENT_HEADER,
	VIEW_HEADER,
	VIEW_LOCATION_HEADER,
	VIEW_ONLY_HEADER,
	VIEW_EXCEPT_HEADER,
	VIEW_VERSION_HEADER,
} from './protocol';

export type RouterEvent = 'start' | 'finish' | 'error';

export interface VisitOptions {
	data?: Record<string, unknown>;
	only?: string[];
	except?: string[];
	headers?: Record<string, string>;
	replace?: boolean;
	preserveScroll?: boolean;
	/** Called with the server's `{ field: message }` bag on a 422 validation response. */
	onError?: (errors: Record<string, string>) => void;
}

interface RouterState {
	Component: PageComponent;
	page: ViewPage;
}

type Listener = (state: RouterState) => void;

/** Read a cookie value in the browser (used for the CSRF double-submit token). */
function readCookie(name: string): string | undefined {
	if (typeof document === 'undefined') return undefined;
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : undefined;
}

class Router {
	private resolver?: PageResolver;
	private state?: RouterState;
	private listeners = new Set<Listener>();
	private events: Record<RouterEvent, Set<(...args: any[]) => void>> = {
		start: new Set(),
		finish: new Set(),
		error: new Set(),
	};

	/** Initialize with the hydration resolver + the SSR page/component. */
	init(resolver: PageResolver, initial: RouterState): void {
		this.resolver = resolver;
		this.state = initial;
		if (typeof window !== 'undefined') {
			window.history.replaceState({ kratosView: true }, '', initial.page.url);
			window.addEventListener('popstate', () => {
				void this.request('GET', window.location.pathname + window.location.search, {
					replace: true,
					preserveScroll: true,
				});
			});
		}
	}

	getState(): RouterState | undefined {
		return this.state;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	on(event: RouterEvent, cb: (...args: any[]) => void): () => void {
		this.events[event].add(cb);
		return () => this.events[event].delete(cb);
	}

	visit(url: string, options: VisitOptions = {}): Promise<void> {
		return this.request('GET', url, options);
	}
	get(url: string, options?: VisitOptions): Promise<void> {
		return this.request('GET', url, options);
	}
	post(url: string, data?: Record<string, unknown>, options?: VisitOptions): Promise<void> {
		return this.request('POST', url, { ...options, data });
	}
	put(url: string, data?: Record<string, unknown>, options?: VisitOptions): Promise<void> {
		return this.request('PUT', url, { ...options, data });
	}
	patch(url: string, data?: Record<string, unknown>, options?: VisitOptions): Promise<void> {
		return this.request('PATCH', url, { ...options, data });
	}
	delete(url: string, options?: VisitOptions): Promise<void> {
		return this.request('DELETE', url, options);
	}

	/** Re-fetch the current URL, optionally only named props (partial reload). */
	reload(options: { only?: string[]; except?: string[] } = {}): Promise<void> {
		const url = this.state?.page.url ?? window.location.pathname + window.location.search;
		return this.request('GET', url, { ...options, replace: true, preserveScroll: true });
	}

	async request(method: string, url: string, options: VisitOptions = {}): Promise<void> {
		this.emit('start');
		try {
			const isGet = method === 'GET' || method === 'HEAD';
			const headers: Record<string, string> = {
				[VIEW_HEADER]: 'true',
				Accept: 'application/json',
				...(options.headers ?? {}),
			};
			if (this.state?.page.version) headers[VIEW_VERSION_HEADER] = this.state.page.version;
			if (this.state?.page.component) headers[VIEW_COMPONENT_HEADER] = this.state.page.component;
			if (options.only?.length) headers[VIEW_ONLY_HEADER] = options.only.join(',');
			if (options.except?.length) headers[VIEW_EXCEPT_HEADER] = options.except.join(',');
			if (!isGet) {
				headers['Content-Type'] = 'application/json';
				const csrf = readCookie(CSRF_COOKIE);
				if (csrf) headers[CSRF_HEADER] = csrf;
			}

			const res = await fetch(url, {
				method,
				credentials: 'include',
				headers,
				body: isGet ? undefined : JSON.stringify(options.data ?? {}),
			});

			// Asset version drifted or auth redirect for an XHR request → hard navigate.
			if (res.status === 409) {
				window.location.href = res.headers.get(VIEW_LOCATION_HEADER) ?? url;
				return;
			}
			// Validation errors from a mutating view route.
			if (res.status === 422) {
				const body = await res.json().catch(() => ({}));
				options.onError?.(body.errors ?? {});
				this.emit('error', body.errors ?? {});
				return;
			}
			// A non-view response (e.g. a redirect landed somewhere without the header) → hard navigate.
			if (res.headers.get(VIEW_HEADER) !== 'true') {
				window.location.href = res.url || url;
				return;
			}

			const page = (await res.json()) as ViewPage;
			await this.swap(page, { replace: options.replace ?? !isGet, preserveScroll: options.preserveScroll });
			this.emit('finish');
		} catch (error) {
			this.emit('error', error);
			throw error;
		}
	}

	private async swap(page: ViewPage, opts: { replace?: boolean; preserveScroll?: boolean }): Promise<void> {
		if (!this.resolver) throw new Error('[kratosjs] Router not initialized.');
		const Component = await this.resolver.resolve(page.component);
		this.state = { Component, page };
		if (typeof window !== 'undefined') {
			const method = opts.replace ? 'replaceState' : 'pushState';
			window.history[method]({ kratosView: true }, '', page.url);
			if (!opts.preserveScroll) window.scrollTo(0, 0);
		}
		for (const listener of this.listeners) listener(this.state);
	}

	private emit(event: RouterEvent, ...args: any[]): void {
		for (const cb of this.events[event]) cb(...args);
	}
}

/** The singleton client router. */
export const router = new Router();
