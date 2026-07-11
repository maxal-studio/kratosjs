import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { input, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { DRIVERS, DRIVER_KEYS, type DriverKey, type DriverDescriptor } from '../drivers';
import { ADAPTERS, ADAPTER_KEYS, type AdapterKey, type AdapterDescriptor } from '../adapters';
import { renderTemplateTree, templatePath, toKebabCase, type TokenMap } from '../render';
import { kratosCoreDep, kratosReactDep } from '../versions';

const MIKRO_ORM_CORE = '^7.1.4';

export interface NewCommandOptions {
	driver?: string;
	http?: string;
	install?: boolean;
	local?: boolean;
}

/** Resolve the monorepo root (only meaningful with --local). */
function monorepoRoot(): string {
	// dist/commands/new.js -> dist -> kratosjs-cli -> packages -> repo root
	return path.resolve(__dirname, '..', '..', '..', '..');
}

function buildDependencies(
	driver: DriverDescriptor,
	adapter: AdapterDescriptor,
	local: boolean,
): Record<string, string> {
	return {
		'@maxal_studio/kratosjs': kratosCoreDep(local),
		// The chosen HTTP adapter (the framework arrives transitively; apps using the
		// raw escape hatch should add express/fastify themselves)
		[adapter.packageName]: adapter.dep(local),
		'@mikro-orm/core': MIKRO_ORM_CORE,
		...driver.dependencies,
		dotenv: '^17.4.2',
	};
}

function buildDevDependencies(local: boolean): Record<string, string> {
	return {
		'@maxal_studio/kratosjs-react': kratosReactDep(local),
		'@types/node': '^25.9.3',
		react: '^19.2.7',
		'react-dom': '^19.2.7',
		'react-hook-form': '^7.79.0',
		tsx: '^4.22.4',
		typescript: '^5.9.3',
		vite: '^7.3.5',
	};
}

/** JSON.stringify an object and re-indent so it nests under a one-tab key. */
function jsonBlock(obj: Record<string, string>): string {
	return JSON.stringify(obj, null, '\t')
		.split('\n')
		.map((line, i) => (i === 0 ? line : '\t' + line))
		.join('\n');
}

function resolveDriver(value: string | undefined): DriverDescriptor | null {
	if (!value) {
		return null;
	}
	const key = value.toLowerCase() as DriverKey;
	return DRIVERS[key] ?? null;
}

function resolveAdapter(value: string | undefined): AdapterDescriptor | null {
	if (!value) {
		return null;
	}
	const key = value.toLowerCase() as AdapterKey;
	return ADAPTERS[key] ?? null;
}

export async function runNew(nameArg: string | undefined, options: NewCommandOptions): Promise<void> {
	const projectName =
		nameArg ??
		(await input({
			message: 'Project name:',
			default: 'my-kratosjs-app',
			validate: value => (value.trim().length > 0 ? true : 'Please enter a project name'),
		}));

	const appName = toKebabCase(projectName);
	const targetDir = path.resolve(process.cwd(), appName);

	if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
		console.error(pc.red(`✖ Directory "${appName}" already exists and is not empty.`));
		process.exit(1);
	}

	let driver = resolveDriver(options.driver);
	if (options.driver && !driver) {
		console.error(pc.red(`✖ Unknown driver "${options.driver}". Valid drivers: ${DRIVER_KEYS.join('|')}`));
		process.exit(1);
	}

	if (!driver) {
		const driverKey = await select<DriverKey>({
			message: 'Which database do you want to use?',
			choices: DRIVER_KEYS.map(key => ({ name: DRIVERS[key].label, value: key })),
		});
		driver = DRIVERS[driverKey];
	}

	let adapter = resolveAdapter(options.http);
	if (options.http && !adapter) {
		console.error(pc.red(`✖ Unknown HTTP adapter "${options.http}". Valid options: ${ADAPTER_KEYS.join('|')}`));
		process.exit(1);
	}

	if (!adapter) {
		const adapterKey = await select<AdapterKey>({
			message: 'Which HTTP framework do you want to use?',
			choices: ADAPTER_KEYS.map(key => ({ name: ADAPTERS[key].label, value: key })),
		});
		adapter = ADAPTERS[adapterKey];
	}

	const local = options.local ?? false;

	const tokens: TokenMap = {
		appName,
		appTitle: `${appName} admin`,
		driverLabel: driver.label,
		driverImport: driver.driverImport,
		migratorImport: driver.migratorImport,
		ormConfig: driver.ormConfig,
		idProps: driver.idProps,
		idInterfaceFields: driver.idInterfaceFields,
		envVars: driver.envVars,
		adapterLabel: adapter.label,
		adapterImport: adapter.adapterImport,
		adapterNew: adapter.adapterNew,
		dependencies: jsonBlock(buildDependencies(driver, adapter, local)),
		devDependencies: jsonBlock(buildDevDependencies(local)),
	};

	console.log('');
	console.log(pc.cyan(`Creating a new KratosJs app in ${pc.bold(targetDir)}`));
	console.log(pc.dim(`  driver: ${driver.label}   http: ${adapter.label}${local ? '   (local file: links)' : ''}`));
	console.log('');

	fs.mkdirSync(targetDir, { recursive: true });
	const result = renderTemplateTree(templatePath('app'), targetDir, tokens);

	for (const file of result.created) {
		console.log(`  ${pc.green('+')} ${file}`);
	}

	const install = options.install ?? true;
	let built = false;
	if (install) {
		console.log('');
		console.log(pc.cyan('Installing dependencies...'));
		let installOk = false;
		try {
			execSync('npm install', { cwd: local ? monorepoRoot() : targetDir, stdio: 'inherit' });
			installOk = true;
		} catch {
			console.error(pc.yellow('⚠ npm install failed — you can run it manually later.'));
		}

		if (installOk) {
			console.log('');
			console.log(pc.cyan('Building app...'));
			try {
				execSync('npm run build', { cwd: targetDir, stdio: 'inherit' });
				built = true;
			} catch {
				console.error(pc.yellow('⚠ npm run build failed — you can run it manually later.'));
			}
		}
	}

	printNextSteps(appName, install, built);
}

function printNextSteps(appName: string, installed: boolean, built: boolean): void {
	const steps = [
		`cd ${appName}`,
		'cp .env.example .env   ' + pc.dim('# then edit DB settings'),
		...(installed ? [] : ['npm install']),
		...(built ? [] : ['npm run build']),
		'npm run dev',
	];

	console.log('');
	console.log(pc.green('✔ Done! Next steps:'));
	console.log('');
	for (const step of steps) {
		console.log(`  ${pc.bold(step)}`);
	}
	console.log('');
	console.log(pc.dim('Login with admin@example.com / password once the server is running.'));
	console.log('');
}
