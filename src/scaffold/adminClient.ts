import fs from 'fs';
import path from 'path';

export interface ScaffoldAdminClientResult {
	created: string[];
	skipped: string[];
}

const INDEX_HTML = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<!-- VALAJS_PANEL_FAVICON -->
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<!-- VALAJS_PANEL_TITLE -->
		<!-- VALAJS_PANEL_SETTINGS -->
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/admin/main.tsx"></script>
	</body>
</html>
`;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import { kratosAdminVite } from '@maxal_studio/kratosjs/vite';

export default defineConfig(kratosAdminVite());
`;

const MAIN_TSX = `import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// Import plugin client manifests, e.g.:
// import starRating from '@maxal_studio/kratosjs-plugin-star-rating/client';

mountAdminPanel({
	plugins: [],
});
`;

const ADMIN_CLIENT_FILES: Array<{ relativePath: string; content: string }> = [
	{ relativePath: 'index.html', content: INDEX_HTML },
	{ relativePath: 'vite.config.mts', content: VITE_CONFIG },
	{ relativePath: 'src/admin/main.tsx', content: MAIN_TSX },
];

/**
 * Scaffold the standard KratosJs admin client files into an app directory.
 * Idempotent: only creates files that do not already exist (never overwrites).
 */
export function scaffoldAdminClient(appRoot: string): ScaffoldAdminClientResult {
	const created: string[] = [];
	const skipped: string[] = [];

	for (const { relativePath, content } of ADMIN_CLIENT_FILES) {
		const filePath = path.join(appRoot, relativePath);

		if (fs.existsSync(filePath)) {
			skipped.push(relativePath);
			continue;
		}

		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content, 'utf-8');
		created.push(relativePath);
	}

	return { created, skipped };
}

/**
 * Returns true when the app has the minimum admin client entry (index.html + vite config).
 */
export function hasAdminClientEntry(appRoot: string): boolean {
	const viteConfig = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs']
		.map(file => path.join(appRoot, file))
		.find(file => fs.existsSync(file));

	return !!viteConfig && fs.existsSync(path.join(appRoot, 'index.html'));
}

/**
 * Resolve the app's vite config path, or throw if missing after scaffolding.
 */
export function resolveAppViteConfig(appRoot: string): string {
	const viteConfig = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs']
		.map(file => path.join(appRoot, file))
		.find(file => fs.existsSync(file));

	if (!viteConfig) {
		throw new Error(
			'[kratosjs] Admin client vite config not found. Run "npx kratosjs init" in your app directory.',
		);
	}

	return viteConfig;
}
