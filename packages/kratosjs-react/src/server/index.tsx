import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import { buildPageResolver, type PageRegistry } from '../views/pageResolver';
import { ViewApp, resolveLayout, DefaultLayout, type LayoutComponent } from '../views/ViewApp';
import { createServerHeadCollector } from '../views/head';
import type { ViewPage } from '../views/protocol';

/**
 * This module is the ONLY place that imports `react-dom/server`. It is bundled into
 * the app's Vite-built SSR entry (`entry-server.tsx`) and loaded by the KratosJs
 * core at runtime — core itself never imports React.
 */

export interface ServerRendererOptions {
	/** App page components (usually `import.meta.glob('./pages/**\/*.tsx')`). */
	pages?: PageRegistry;
	/** Plugin client manifests (their `pages` are namespaced `plugin::Key`). */
	plugins?: Array<{ name?: string; pages?: PageRegistry }>;
	/** Default layout wrapping every page (a page's static `layout` overrides it). */
	layout?: LayoutComponent;
}

export interface ServerRenderResult {
	html: string;
	headTags: string;
}

/**
 * Create the SSR render function used by `entry-server.tsx`. Given a page object it
 * resolves the component, renders it to an HTML string (buffered `renderToString`),
 * and serializes any `<Head>` tags collected during render.
 *
 * ```tsx
 * export const render = createServerRenderer({
 *   pages: import.meta.glob('./pages/**\/*.tsx'),
 *   plugins: pluginClients,
 * });
 * ```
 */
export function createServerRenderer(options: ServerRendererOptions): (page: ViewPage) => Promise<ServerRenderResult> {
	const resolver = buildPageResolver(options);
	const fallbackLayout = options.layout ?? DefaultLayout;

	return async (page: ViewPage): Promise<ServerRenderResult> => {
		const Component = await resolver.resolve(page.component);
		const Layout = resolveLayout(Component, fallbackLayout);
		const head = createServerHeadCollector();

		const html = renderToString(<ViewApp head={head} page={page} Component={Component} Layout={Layout} />);

		const headTags = head.nodes.length
			? renderToStaticMarkup(
					<>
						{head.nodes.map((node, i) => (
							<React.Fragment key={i}>{node}</React.Fragment>
						))}
					</>,
				)
			: '';

		return { html, headTags };
	};
}
