import { useEffect, useRef } from 'react';
import { ModalState } from '../contexts/ResourceModalContext';
import { buildModalPath } from '../utils/modalUrl';
import { withPanelBase, stripPanelBase } from '../utils/panelPath';

/**
 * Keeps the browser address bar in sync with the top of the modal stack.
 *
 * The modal stack is the single source of truth for the URL while modals are open.
 * Whenever the stack grows (or its top changes at the same depth) this writes the
 * matching URL with `history.replaceState` — never React Router `navigate()`, so the
 * mounted page is not remounted and the browser does not redirect. `replaceState`
 * means opening a modal does not add a history entry (Back exits the panel), matching
 * the existing breadcrumb/close behaviour.
 *
 * Stack *shrink* is intentionally ignored: the close handlers in `AdminPanel` already
 * restore the URL on close (including cross-resource `originUrl`), so reacting here too
 * would fight them. The `current !== target` guard makes the write a no-op when the URL
 * was already set (deep-link on load, or the list page's `navigate`), preventing double
 * writes and any loop with `ResourceListPage`'s URL→modal effect.
 */
export function useModalUrlSync(modalStack: ModalState[]): void {
	const prevLength = useRef(modalStack.length);

	useEffect(() => {
		const prev = prevLength.current;
		const len = modalStack.length;
		prevLength.current = len;

		// Empty stack or a pop → the close handlers own the URL.
		if (len === 0 || len < prev) return;

		const target = buildModalPath(modalStack[len - 1]);
		if (!target) return; // action / unroutable modal → leave the parent's URL showing

		// Compare in root-relative space (React Router strips the basename; raw
		// window.location does not), then write the panel-path-prefixed URL.
		const current = stripPanelBase(window.location.pathname) + window.location.search;
		if (current !== target) {
			window.history.replaceState(null, '', withPanelBase(target));
		}
	}, [modalStack]);
}
