#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { runNew } from './commands/new';
import { runPlugin } from './commands/plugin';
import { runInit } from './commands/init';
import { DRIVER_KEYS } from './drivers';
import { ADAPTER_KEYS } from './adapters';

const program = new Command();

program.name('kratosjs').description('Scaffold KratosJs apps and plugins').version(require('../package.json').version);

program
	.command('new')
	.argument('[name]', 'project name')
	.description('Create a new KratosJs app')
	.option('--driver <driver>', `database driver (${DRIVER_KEYS.join('|')})`)
	.option('--http <adapter>', `HTTP framework (${ADAPTER_KEYS.join('|')})`)
	.option('--no-install', 'skip installing dependencies')
	.option('--local', 'use file: links to the monorepo packages (for local testing)')
	.action(async (name, options) => {
		await runNew(name, options);
	});

program
	.command('plugin')
	.argument('[name]', 'plugin name')
	.description('Scaffold a standalone KratosJs plugin package')
	.option('--no-client', 'scaffold a server-only plugin (skip the React client entry)')
	.action(async (name, options) => {
		await runPlugin(name, options);
	});

program
	.command('init')
	.description('Scaffold the admin client entry into an existing app')
	.action(async () => {
		await runInit();
	});

program.parseAsync(process.argv).catch((error: unknown) => {
	if (error instanceof Error && error.name === 'ExitPromptError') {
		console.log(pc.dim('\nAborted.'));
		process.exit(130);
	}
	console.error(pc.red(error instanceof Error ? error.message : String(error)));
	process.exit(1);
});
