import { ModalState } from '../contexts/ResourceModalContext';

/**
 * Maps a modal to the browser URL path that represents it, so the address bar can
 * stay in sync with the modal stack for bookmarking/deep-linking.
 *
 * Returns `null` for modals that have no routable URL (action modals, or a view/edit
 * modal that is somehow missing its record id). Callers should leave the URL untouched
 * in that case — the parent modal's URL keeps showing.
 *
 * These paths are the inverse of the URL parsing in `ResourceListPage`'s deep-link effect.
 */
export function buildModalPath(modal: ModalState): string | null {
	switch (modal.mode) {
		case 'create':
			return `/${modal.resource}/create`;
		case 'view':
			return modal.recordId ? `/${modal.resource}/${modal.recordId}` : null;
		case 'edit':
			return modal.recordId ? `/${modal.resource}/${modal.recordId}/edit` : null;
		case 'action':
		default:
			return null;
	}
}
