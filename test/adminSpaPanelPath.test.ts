import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { Panel } from '../src/Panel';
import { AdminSpaService } from '../src/http/adminSpa';

// getIndexHtml() rewrites a relative-base ('./') build's asset URLs to absolute under
// the panel path — the mechanism that lets the admin UI path be configured on the
// backend alone (no Vite `base` in the app's vite.config).

const BUILT_INDEX = [
	'<!doctype html><html><head>',
	'<!-- VALAJS_PANEL_TITLE -->',
	'<!-- VALAJS_PANEL_FAVICON -->',
	'<!-- VALAJS_PANEL_SETTINGS -->',
	'<script type="module" crossorigin src="./assets/index-abc.js"></script>',
	'<link rel="modulepreload" crossorigin href="./assets/vendor-def.js">',
	'<link rel="stylesheet" crossorigin href="./assets/index-ghi.css">',
	'</head><body><div id="root"></div></body></html>',
].join('\n');

const dirs: string[] = [];

function makeDist(indexHtml = BUILT_INDEX): string {
	const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kratos-spa-base-'));
	dirs.push(appRoot);
	fs.mkdirSync(path.join(appRoot, 'dist', 'admin'), { recursive: true });
	fs.writeFileSync(path.join(appRoot, 'dist', 'admin', 'index.html'), indexHtml);
	return appRoot;
}

function spaFor(panelPath: string, indexHtml?: string): AdminSpaService {
	const panel = Panel.make('admin').panelPath(panelPath);
	return new AdminSpaService(panel, { appRoot: makeDist(indexHtml), mode: 'production', panelPath });
}

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

describe('getIndexHtml — relative asset base → absolute under panel path', () => {
	it('rewrites ./assets to /admin/assets when panelPath=/admin', () => {
		const html = spaFor('/admin').getIndexHtml();
		expect(html).toContain('src="/admin/assets/index-abc.js"');
		expect(html).toContain('href="/admin/assets/vendor-def.js"');
		expect(html).toContain('href="/admin/assets/index-ghi.css"');
		expect(html).not.toContain('./assets/');
		// The panel path global is injected for the client router basename.
		expect(html).toContain("window.__VALAJS_PANEL_PATH__ = '/admin'");
	});

	it('rewrites ./assets to /assets at the root panel path', () => {
		const html = spaFor('/').getIndexHtml();
		expect(html).toContain('src="/assets/index-abc.js"');
		expect(html).toContain('href="/assets/index-ghi.css"');
		expect(html).not.toContain('./assets/');
	});

	it('leaves an already-absolute (/assets) build intact at root', () => {
		const absoluteBuild = BUILT_INDEX.replace(/\.\//g, '/');
		const html = spaFor('/', absoluteBuild).getIndexHtml();
		expect(html).toContain('src="/assets/index-abc.js"');
		expect(html).toContain('href="/assets/index-ghi.css"');
	});
});
