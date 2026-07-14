import React, { useEffect, useState, type ComponentType } from 'react';
import { HeadContext, type HeadCollector } from './head';
import { ViewContext } from './ViewContext';
import { router } from './router';
import type { PageComponent } from './pageResolver';
import type { ViewPage } from './protocol';

export type LayoutComponent = ComponentType<{ children: React.ReactNode }>;

/** Default layout: render the page unwrapped. */
export const DefaultLayout: LayoutComponent = ({ children }) => <>{children}</>;

/** Resolve the layout for a page: its static `layout` wins, then the app default. */
export function resolveLayout(Component: PageComponent, fallback?: LayoutComponent): LayoutComponent {
	return (Component.layout as LayoutComponent) ?? fallback ?? DefaultLayout;
}

/**
 * The shared render tree used by both the SSR renderer and the client root, so
 * hydration matches exactly: HeadContext → ViewContext → Layout → Page.
 */
export function ViewApp({
	head,
	page,
	Component,
	Layout,
}: {
	head: HeadCollector | null;
	page: ViewPage;
	Component: PageComponent;
	Layout: LayoutComponent;
}) {
	return (
		<HeadContext.Provider value={head}>
			<ViewContext.Provider value={page}>
				<Layout>
					<Component {...(page.props as Record<string, unknown>)} />
				</Layout>
			</ViewContext.Provider>
		</HeadContext.Provider>
	);
}

/**
 * The client root: subscribes to the router and re-renders the current page on
 * navigation. Head is applied via the client effect path (collector = null).
 */
export function ViewRoot({ layout }: { layout?: LayoutComponent }) {
	const [state, setState] = useState(() => router.getState()!);
	useEffect(() => router.subscribe(setState), []);

	const Component = state.Component;
	const Layout = resolveLayout(Component, layout);
	return <ViewApp head={null} page={state.page} Component={Component} Layout={Layout} />;
}
