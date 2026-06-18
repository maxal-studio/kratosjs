import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Without vitest globals, React Testing Library cannot auto-register its
// cleanup — do it explicitly so trees don't leak between tests.
afterEach(() => {
	cleanup();
});

// jsdom does not implement matchMedia; several components consult it for
// responsive defaults (widgets expanded, dark-mode preference).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList;
}
