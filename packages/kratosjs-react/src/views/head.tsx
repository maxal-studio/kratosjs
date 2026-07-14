import React, { createContext, useContext, useEffect, type ReactNode } from 'react';

/**
 * Head management. On the server a collector accumulates the nodes so the SSR
 * renderer can serialize them into `<!--kratos-head-->`; on the client they are
 * applied to `document.head` imperatively (title + meta + link), covering the SEO
 * essentials without pulling in a helmet dependency.
 */
export interface HeadCollector {
	isServer: boolean;
	collect(node: ReactNode): void;
}

export const HeadContext = createContext<HeadCollector | null>(null);

/** Server-side collector: stores head nodes for the SSR renderer to serialize. */
export function createServerHeadCollector(): HeadCollector & { nodes: ReactNode[] } {
	const nodes: ReactNode[] = [];
	return {
		isServer: true,
		nodes,
		collect(node) {
			nodes.push(node);
		},
	};
}

function extractText(children: ReactNode): string {
	if (children == null) return '';
	if (typeof children === 'string' || typeof children === 'number') return String(children);
	if (Array.isArray(children)) return children.map(extractText).join('');
	return '';
}

const ATTR_ALIASES: Record<string, string> = {
	className: 'class',
	httpEquiv: 'http-equiv',
	charSet: 'charset',
};

function applyHeadOnClient(children: ReactNode): (() => void) | undefined {
	if (children == null) return undefined;
	const created: HTMLElement[] = [];
	let previousTitle: string | undefined;

	React.Children.forEach(children, child => {
		if (!React.isValidElement(child)) return;
		const type = child.type;
		const props = child.props as Record<string, unknown>;
		if (type === 'title') {
			previousTitle = document.title;
			document.title = extractText(props.children as ReactNode);
			return;
		}
		if (type === 'meta' || type === 'link' || type === 'base') {
			const el = document.createElement(type);
			for (const [key, value] of Object.entries(props)) {
				if (key === 'children' || value == null) continue;
				el.setAttribute(ATTR_ALIASES[key] ?? key, String(value));
			}
			el.setAttribute('data-kratos-head', '');
			document.head.appendChild(el);
			created.push(el);
		}
	});

	return () => {
		if (previousTitle !== undefined) document.title = previousTitle;
		for (const el of created) el.remove();
	};
}

/**
 * Declare document head tags (title, meta, link) for the current page. Works in
 * SSR (serialized into the shell) and on the client (applied on mount, reverted on
 * unmount/navigation).
 *
 * ```tsx
 * <Head>
 *   <title>{post.title}</title>
 *   <meta name="description" content={post.excerpt} />
 * </Head>
 * ```
 */
export function Head({ children }: { children: ReactNode }): null {
	const collector = useContext(HeadContext);
	const isServer = collector?.isServer ?? false;

	// Client application (no-op on the server: effects don't run during renderToString,
	// and we pass null so the hook stays unconditional).
	useEffect(() => {
		if (isServer) return undefined;
		return applyHeadOnClient(children);
	}, [children, isServer]);

	if (collector?.isServer) {
		collector.collect(children);
	}
	return null;
}
