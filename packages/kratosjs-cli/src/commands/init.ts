import pc from 'picocolors';
import { renderTemplateTree, templatePath } from '../render';

/**
 * Scaffold the standard KratosJs admin client entry (index.html, vite config,
 * src/admin/main.tsx) into an existing app. Idempotent: never overwrites.
 */
export async function runInit(): Promise<void> {
	const cwd = process.cwd();
	const result = renderTemplateTree(templatePath('admin-client'), cwd, {});

	if (result.created.length > 0) {
		console.log(pc.green('Created admin client files:'));
		for (const file of result.created) {
			console.log(`  ${pc.green('+')} ${file}`);
		}
	}

	if (result.skipped.length > 0) {
		console.log(pc.dim('Already present (skipped):'));
		for (const file of result.skipped) {
			console.log(`  ${pc.dim('-')} ${file}`);
		}
	}

	if (result.created.length === 0 && result.skipped.length === 0) {
		console.log(pc.dim('No files to scaffold.'));
	}

	console.log('');
	console.log('Ensure these dev dependencies are installed in your app:');
	console.log(pc.dim('  @maxal_studio/kratosjs-react react react-dom react-hook-form vite'));
	console.log('');
	console.log('Recommended package.json scripts:');
	console.log(pc.dim('  "dev": "tsx watch src/index.ts"'));
	console.log(pc.dim('  "build": "npm run build:server && npm run build:admin"'));
	console.log(pc.dim('  "build:server": "tsc"'));
	console.log(pc.dim('  "build:admin": "vite build"'));
	console.log(pc.dim('  "start": "NODE_ENV=production node dist/index.js"'));
}
