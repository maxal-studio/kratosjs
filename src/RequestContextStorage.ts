import { AsyncLocalStorage } from 'node:async_hooks';
import type { RequestContext } from './RequestContext';

/**
 * Request-scoped storage for RequestContext using Node's AsyncLocalStorage.
 * This allows getContext() to return the current request's context from anywhere
 * in the call stack (form(), table(), widgets(), actions(), hooks, etc.) without
 * passing context as a parameter.
 *
 * The Panel runs each request inside requestContextStorage.run(context, next),
 * so all code executed during that request can call getStore() to get the context.
 * Concurrent requests are isolated - each has its own context.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from async storage.
 * Returns undefined when called outside a request (e.g. at registration time, in scripts).
 */
export function getRequestContext(): RequestContext | undefined {
	return requestContextStorage.getStore();
}
