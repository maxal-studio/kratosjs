import { createContext, useContext } from 'react';
import type { ViewPage } from './protocol';

/** The current page shape shared through React context. */
export type ViewContextValue = ViewPage;

export const ViewContext = createContext<ViewContextValue | null>(null);

/** Access the current page object (component name, props, url, version). */
export function usePage<T extends Record<string, unknown> = Record<string, unknown>>(): Omit<
	ViewContextValue,
	'props'
> & { props: T } {
	const ctx = useContext(ViewContext);
	if (!ctx) {
		throw new Error('[kratosjs] usePage() must be used inside a Views app (hydrateViewsApp).');
	}
	return ctx as Omit<ViewContextValue, 'props'> & { props: T };
}

/** Access just the current page props. */
export function useViewProps<T extends Record<string, unknown> = Record<string, unknown>>(): T {
	return usePage<T>().props;
}
