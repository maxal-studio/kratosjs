import React from 'react';
import { describe, expect, it } from 'vitest';
import { createServerRenderer } from '../server';
import { Head } from './head';
import { usePage, useViewProps } from './ViewContext';
import { buildPageResolver, normalizePageKey } from './pageResolver';

/**
 * SSR rendering + head collection for the Views system. Uses createServerRenderer
 * (which imports react-dom/server) exactly as the app's entry-server would.
 */

function PostShow() {
	const { props, component } = usePage<{ title: string }>();
	return (
		<article data-component={component}>
			<Head>
				<title>{props.title}</title>
				<meta name="description" content="A post" />
			</Head>
			<h1>{props.title}</h1>
		</article>
	);
}

describe('createServerRenderer', () => {
	it('renders a page to HTML and collects head tags', async () => {
		const render = createServerRenderer({ pages: { 'blog/Show': PostShow } });
		const { html, headTags } = await render({
			component: 'blog/Show',
			props: { title: 'Hello World' },
			url: '/blog/hello',
			version: null,
		});

		expect(html).toContain('<h1>Hello World</h1>');
		expect(html).toContain('data-component="blog/Show"');
		expect(headTags).toContain('<title>Hello World</title>');
		expect(headTags).toContain('name="description"');
	});

	it('applies a page static layout', async () => {
		const Layout = ({ children }: { children: React.ReactNode }) => <div className="layout">{children}</div>;
		const Page: any = () => <span>content</span>;
		Page.layout = Layout;

		const render = createServerRenderer({ pages: { Page } });
		const { html } = await render({ component: 'Page', props: {}, url: '/', version: null });
		expect(html).toContain('class="layout"');
		expect(html).toContain('<span>content</span>');
	});

	it('resolves plugin pages under a namespaced key', async () => {
		const PluginPage = () => {
			const props = useViewProps<{ n: number }>();
			return <p>{props.n}</p>;
		};
		const render = createServerRenderer({
			plugins: [{ name: 'blog', pages: { 'Post/Show': PluginPage } }],
		});
		const { html } = await render({
			component: 'blog::Post/Show',
			props: { n: 42 },
			url: '/',
			version: null,
		});
		expect(html).toContain('<p>42</p>');
	});

	it('throws a helpful error for an unknown component', async () => {
		const render = createServerRenderer({ pages: { Home: () => <div /> } });
		await expect(render({ component: 'Missing', props: {}, url: '/', version: null })).rejects.toThrow(
			/Unknown view component "Missing"/,
		);
	});
});

describe('pageResolver', () => {
	it('normalizes glob keys to component names', () => {
		expect(normalizePageKey('./pages/blog/Show.tsx')).toBe('blog/Show');
		expect(normalizePageKey('./src/views/pages/Home.tsx')).toBe('Home');
		expect(normalizePageKey('Post/Show')).toBe('Post/Show');
	});

	it('resolves lazy loaders and eager modules', async () => {
		const Comp = () => <div />;
		const resolver = buildPageResolver({
			pages: {
				'./pages/Lazy.tsx': async () => ({ default: Comp }),
				'./pages/Eager.tsx': { default: Comp } as any,
			},
		});
		expect(await resolver.resolve('Lazy')).toBe(Comp);
		expect(await resolver.resolve('Eager')).toBe(Comp);
	});
});
