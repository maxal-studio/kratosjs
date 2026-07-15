/**
 * Client copy of the view protocol constants. These MUST match the server's
 * `src/views/protocol.ts` in `@maxal_studio/kratosjs`. They are duplicated (not
 * imported) so the browser bundle never pulls in the Node core package — the same
 * contract-by-convention approach as the `.k-*` CSS classes.
 */
export const VIEW_HEADER = 'X-Kratos-View';
export const VIEW_VERSION_HEADER = 'X-Kratos-View-Version';
export const VIEW_ONLY_HEADER = 'X-Kratos-View-Only';
export const VIEW_EXCEPT_HEADER = 'X-Kratos-View-Except';
export const VIEW_COMPONENT_HEADER = 'X-Kratos-View-Component';
export const VIEW_LOCATION_HEADER = 'X-Kratos-Location';
export const CSRF_HEADER = 'X-Kratos-CSRF';
export const CSRF_COOKIE = 'kratosjs_csrf';
export const VIEW_PAGE_ELEMENT_ID = '__KRATOS_VIEW_PAGE__';

/** The page object embedded in SSR HTML and returned as JSON on view requests. */
export interface ViewPage {
	component: string;
	props: Record<string, unknown>;
	url: string;
	version: string | null;
}
