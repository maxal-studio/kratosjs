import fs from 'fs';
import path from 'path';

export interface ScaffoldViewsClientResult {
	created: string[];
	skipped: string[];
}

const VIEWS_HTML = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<!--kratos-head-->
	</head>
	<body>
		<div id="kratos-view-root"><!--kratos-app--></div>
		<!--kratos-page-->
		<script type="module" src="/src/views/entry-client.tsx"></script>
	</body>
</html>
`;

const VITE_VIEWS_CONFIG = `import { defineConfig } from 'vite';
import { kratosViewsVite } from '@maxal_studio/kratosjs/vite';

export default defineConfig(kratosViewsVite());
`;

const ENTRY_CLIENT = `import { hydrateViewsApp } from '@maxal_studio/kratosjs-react/views';
import { pluginClients } from 'virtual:kratos-client';

// Every file under ./pages is a view component, keyed by path (e.g. 'blog/Show').
const pages = import.meta.glob('./pages/**/*.tsx');

hydrateViewsApp({ pages, plugins: pluginClients });
`;

const ENTRY_SERVER = `import { createServerRenderer } from '@maxal_studio/kratosjs-react/server';
import { pluginClients } from 'virtual:kratos-client';

const pages = import.meta.glob('./pages/**/*.tsx');

export const render = createServerRenderer({ pages, plugins: pluginClients });
`;

const HOME_PAGE = `import { Head, usePage } from '@maxal_studio/kratosjs-react/views';

export default function Home() {
	const { props } = usePage<{ title?: string }>();
	return (
		<main style={{ fontFamily: 'system-ui', padding: '3rem', maxWidth: 640, margin: '0 auto' }}>
			<Head>
				<title>{props.title ?? 'KratosJs'}</title>
				<meta name="description" content="Built with KratosJs Views" />
			</Head>
			<h1>{props.title ?? 'Welcome to KratosJs Views'}</h1>
			<p>Edit <code>src/views/pages/Home.tsx</code> and register routes with <code>panel.view()</code>.</p>
		</main>
	);
}
`;

const VIEWS_CLIENT_FILES: Array<{ relativePath: string; content: string }> = [
	{ relativePath: 'views.html', content: VIEWS_HTML },
	{ relativePath: 'vite.views.config.mts', content: VITE_VIEWS_CONFIG },
	{ relativePath: 'src/views/entry-client.tsx', content: ENTRY_CLIENT },
	{ relativePath: 'src/views/entry-server.tsx', content: ENTRY_SERVER },
	{ relativePath: 'src/views/pages/Home.tsx', content: HOME_PAGE },
];

/**
 * Scaffold the standard KratosJs views client files into an app directory.
 * Idempotent: only creates files that do not already exist (never overwrites).
 */
export function scaffoldViewsClient(appRoot: string): ScaffoldViewsClientResult {
	const created: string[] = [];
	const skipped: string[] = [];

	for (const { relativePath, content } of VIEWS_CLIENT_FILES) {
		const filePath = path.join(appRoot, relativePath);
		if (fs.existsSync(filePath)) {
			skipped.push(relativePath);
			continue;
		}
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content, 'utf-8');
		created.push(relativePath);
	}

	if (created.length > 0) {
		console.log('[kratosjs] Auto-scaffolded views client files:');
		for (const file of created) {
			console.log(`  + ${file}`);
		}
	}

	return { created, skipped };
}

/** Returns true when the app has the views HTML shell + entry files. */
export function hasViewsClientEntry(appRoot: string): boolean {
	return (
		fs.existsSync(path.join(appRoot, 'views.html')) &&
		fs.existsSync(path.join(appRoot, 'src', 'views', 'entry-server.tsx'))
	);
}
