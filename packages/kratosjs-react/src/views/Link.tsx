import React, { type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { router } from './router';

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
	href: string;
	method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
	data?: Record<string, unknown>;
	only?: string[];
	except?: string[];
	preserveScroll?: boolean;
	replace?: boolean;
}

/** True for a plain left-click without modifier keys (let the browser handle the rest). */
function isPlainClick(event: MouseEvent): boolean {
	return !(
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	);
}

/**
 * Client-side navigation link. Renders an `<a>` but intercepts plain clicks to do
 * an Inertia-style view visit (no full reload). Modifier-clicks fall through to
 * the browser (open in new tab, etc.).
 */
export function Link({
	href,
	method = 'get',
	data,
	only,
	except,
	preserveScroll,
	replace,
	onClick,
	children,
	...rest
}: LinkProps) {
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(event as any);
		if (!isPlainClick(event)) return;
		event.preventDefault();
		const options = { only, except, preserveScroll, replace };
		if (method === 'get') {
			void router.get(href, options);
		} else {
			void router.request(method.toUpperCase(), href, { ...options, data });
		}
	};

	return (
		<a href={href} onClick={handleClick} {...rest}>
			{children}
		</a>
	);
}
