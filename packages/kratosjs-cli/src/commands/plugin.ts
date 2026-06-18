import fs from 'fs';
import path from 'path';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { renderTemplateTree, templatePath, toKebabCase, toPascalCase, toCamelCase, type TokenMap } from '../render';
import { kratosCoreDep, kratosReactDep } from '../versions';

export interface PluginCommandOptions {
	client?: boolean;
}

function buildPackageJson(pluginName: string, withClient: boolean, local: boolean): string {
	const pkg: Record<string, unknown> = {
		name: `kratosjs-plugin-${pluginName}`,
		version: '1.0.0',
		description: `${pluginName} plugin for KratosJs panels`,
		main: './dist/server/index.js',
		types: './dist/server/index.d.ts',
		sideEffects: false,
		exports: {
			'.': {
				types: './dist/server/index.d.ts',
				default: './dist/server/index.js',
			},
			...(withClient
				? {
						'./client': {
							types: './dist/client/index.d.ts',
							default: './dist/client/index.js',
						},
					}
				: {}),
			'./package.json': './package.json',
		},
		files: ['dist'],
		scripts: {
			build: withClient
				? 'npm run clean && tsc -p tsconfig.server.json && tsc -p tsconfig.client.json'
				: 'npm run clean && tsc -p tsconfig.server.json',
			clean: 'rm -rf dist',
		},
		keywords: ['kratosjs', 'kratosjs-plugin'],
		license: 'ISC',
		peerDependencies: withClient
			? {
					'@maxal_studio/kratosjs': kratosCoreDep(local),
					'@maxal_studio/kratosjs-react': kratosReactDep(local),
					react: '^19.0.0',
					'react-hook-form': '^7.0.0',
				}
			: {
					'@maxal_studio/kratosjs': kratosCoreDep(local),
				},
		devDependencies: withClient
			? {
					'@types/react': '^19.2.5',
					typescript: '^5.9.3',
				}
			: {
					typescript: '^5.9.3',
				},
	};

	return JSON.stringify(pkg, null, '\t') + '\n';
}

export async function runPlugin(nameArg: string | undefined, options: PluginCommandOptions): Promise<void> {
	const rawName =
		nameArg ??
		(await input({
			message: 'Plugin name:',
			default: 'my-plugin',
			validate: value => (value.trim().length > 0 ? true : 'Please enter a plugin name'),
		}));

	const pluginName = toKebabCase(rawName);
	const PluginName = toPascalCase(rawName);
	const pluginCamel = toCamelCase(rawName);
	const withClient = options.client ?? false;
	const targetDir = path.resolve(process.cwd(), `kratosjs-plugin-${pluginName}`);

	if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
		console.error(pc.red(`✖ Directory "${path.basename(targetDir)}" already exists and is not empty.`));
		process.exit(1);
	}

	const tokens: TokenMap = {
		pluginName,
		PluginName,
		pluginCamel,
		registerBody: withClient
			? `panel.registerCustomField('${pluginName}');`
			: `// e.g. panel.registerCustomField('${pluginName}');`,
	};

	console.log('');
	console.log(pc.cyan(`Creating a new KratosJs plugin in ${pc.bold(targetDir)}`));
	console.log(pc.dim(`  ${withClient ? 'server + client' : 'server-only'}`));
	console.log('');

	fs.mkdirSync(targetDir, { recursive: true });

	const result = renderTemplateTree(templatePath('plugin'), targetDir, tokens);
	if (withClient) {
		renderTemplateTree(templatePath('plugin-client'), targetDir, tokens, result);
	}

	fs.writeFileSync(path.join(targetDir, 'package.json'), buildPackageJson(pluginName, withClient, false), 'utf-8');
	result.created.unshift('package.json');

	for (const file of result.created) {
		console.log(`  ${pc.green('+')} ${file}`);
	}

	console.log('');
	console.log(pc.green('✔ Plugin scaffolded. Next steps:'));
	console.log('');
	console.log(`  ${pc.bold(`cd ${path.basename(targetDir)}`)}`);
	console.log(`  ${pc.bold('npm install')}`);
	console.log(`  ${pc.bold('npm run build')}`);
	console.log('');
}
