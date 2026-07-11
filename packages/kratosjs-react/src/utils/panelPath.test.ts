import { afterEach, describe, expect, it } from 'vitest';
import { getPanelBasePath, getRouterBasename, withPanelBase, stripPanelBase } from './panelPath';

function setPanelPath(value: string | undefined): void {
	(window as unknown as { __VALAJS_PANEL_PATH__?: string }).__VALAJS_PANEL_PATH__ = value;
}

afterEach(() => setPanelPath(undefined));

describe('panelPath utils — root (default)', () => {
	it('reads / and yields undefined basename', () => {
		expect(getPanelBasePath()).toBe('/');
		expect(getRouterBasename()).toBeUndefined();
	});

	it('withPanelBase / stripPanelBase are no-ops at root', () => {
		expect(withPanelBase('/users/1')).toBe('/users/1');
		expect(stripPanelBase('/users/1')).toBe('/users/1');
	});
});

describe('panelPath utils — /admin', () => {
	it('reads the injected path and yields it as basename', () => {
		setPanelPath('/admin');
		expect(getPanelBasePath()).toBe('/admin');
		expect(getRouterBasename()).toBe('/admin');
	});

	it('withPanelBase prefixes root-relative paths', () => {
		setPanelPath('/admin');
		expect(withPanelBase('/users/1')).toBe('/admin/users/1');
		expect(withPanelBase('users/1')).toBe('/admin/users/1');
	});

	it('stripPanelBase removes the base (and the bare base → /)', () => {
		setPanelPath('/admin');
		expect(stripPanelBase('/admin/users/1')).toBe('/users/1');
		expect(stripPanelBase('/admin')).toBe('/');
		// A path outside the base is returned unchanged.
		expect(stripPanelBase('/other')).toBe('/other');
	});

	it('round-trips', () => {
		setPanelPath('/admin');
		expect(stripPanelBase(withPanelBase('/posts/create'))).toBe('/posts/create');
	});
});
