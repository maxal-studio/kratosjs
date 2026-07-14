import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { buildPageResolver, type PageRegistry } from './pageResolver';
import { router } from './router';
import { ViewRoot, type LayoutComponent } from './ViewApp';
import { VIEW_PAGE_ELEMENT_ID, type ViewPage } from './protocol';

export interface HydrateViewsOptions {
	/** App page components (usually `import.meta.glob('./pages/**\/*.tsx')`). */
	pages?: PageRegistry;
	/** Plugin client manifests (their `pages` are namespaced `plugin::Key`). */
	plugins?: Array<{ name?: string; pages?: PageRegistry }>;
	/** Default layout wrapping every page (a page's static `layout` overrides it). */
	layout?: LayoutComponent;
	/** The mount element id (default 'kratos-view-root'). */
	rootId?: string;
}

/** Read the SSR-embedded page object from the DOM. */
function readInitialPage(): ViewPage {
	const el = typeof document !== 'undefined' ? document.getElementById(VIEW_PAGE_ELEMENT_ID) : null;
	if (el?.textContent) {
		return JSON.parse(el.textContent) as ViewPage;
	}
	return {
		component: '',
		props: {},
		url: typeof window !== 'undefined' ? window.location.pathname : '/',
		version: null,
	};
}

/**
 * Hydrate a server-rendered Views app: read the embedded page object, resolve its
 * component, initialize the router, and hydrate the DOM. Subsequent navigations are
 * handled client-side by the router.
 */
export async function hydrateViewsApp(options: HydrateViewsOptions): Promise<void> {
	const { pages, plugins, layout, rootId = 'kratos-view-root' } = options;
	const page = readInitialPage();
	const resolver = buildPageResolver({ pages, plugins });
	const Component = await resolver.resolve(page.component);
	router.init(resolver, { Component, page });

	const root = document.getElementById(rootId);
	if (!root) {
		throw new Error(`[kratosjs] Views root element #${rootId} not found.`);
	}
	hydrateRoot(root, <ViewRoot layout={layout} />);
}
