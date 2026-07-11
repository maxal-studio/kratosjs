import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function readVersionFromPackageJson(pkgJsonPath: string): string | null {
	if (!fs.existsSync(pkgJsonPath)) {
		return null;
	}

	try {
		const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as { version?: string };
		return typeof pkg.version === 'string' ? pkg.version : null;
	} catch {
		return null;
	}
}

function monorepoRoot(): string {
	// dist/versions.js -> dist -> kratosjs-cli -> packages -> repo root
	return path.resolve(__dirname, '..', '..', '..', '..');
}

function readMonorepoVersion(relativePath: string): string | null {
	const pkgPath =
		relativePath === '.'
			? path.join(monorepoRoot(), 'package.json')
			: path.join(monorepoRoot(), relativePath, 'package.json');
	return readVersionFromPackageJson(pkgPath);
}

function readInstalledVersion(packageName: string): string | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pkgPath = require.resolve(`${packageName}/package.json`);
		return readVersionFromPackageJson(pkgPath);
	} catch {
		return null;
	}
}

function readPublishedVersion(packageName: string): string | null {
	try {
		return execSync(`npm view ${packageName} version`, {
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return null;
	}
}

function toVersionRange(version: string | null): string {
	return version ? `^${version}` : 'latest';
}

/** Resolve a semver range for @maxal_studio/kratosjs. */
export function kratosCoreDep(local: boolean): string {
	if (local) {
		return 'file:..';
	}

	return toVersionRange(
		readInstalledVersion('@maxal_studio/kratosjs') ??
			readMonorepoVersion('.') ??
			readPublishedVersion('@maxal_studio/kratosjs'),
	);
}

/** Resolve a semver range for @maxal_studio/kratosjs-react. */
export function kratosReactDep(local: boolean): string {
	if (local) {
		return 'file:../packages/kratosjs-react';
	}

	return toVersionRange(
		readInstalledVersion('@maxal_studio/kratosjs-react') ??
			readMonorepoVersion('packages/kratosjs-react') ??
			readPublishedVersion('@maxal_studio/kratosjs-react'),
	);
}

/** Resolve a semver range for @maxal_studio/kratosjs-express (the default HTTP adapter). */
export function kratosExpressDep(local: boolean): string {
	if (local) {
		return 'file:../packages/kratosjs-express';
	}

	return toVersionRange(
		readInstalledVersion('@maxal_studio/kratosjs-express') ??
			readMonorepoVersion('packages/kratosjs-express') ??
			readPublishedVersion('@maxal_studio/kratosjs-express'),
	);
}

/** Resolve a semver range for @maxal_studio/kratosjs-fastify (an alternative HTTP adapter). */
export function kratosFastifyDep(local: boolean): string {
	if (local) {
		return 'file:../packages/kratosjs-fastify';
	}

	return toVersionRange(
		readInstalledVersion('@maxal_studio/kratosjs-fastify') ??
			readMonorepoVersion('packages/kratosjs-fastify') ??
			readPublishedVersion('@maxal_studio/kratosjs-fastify'),
	);
}

/** Resolve a semver range for @maxal_studio/kratosjs-hapi (an alternative HTTP adapter). */
export function kratosHapiDep(local: boolean): string {
	if (local) {
		return 'file:../packages/kratosjs-hapi';
	}

	return toVersionRange(
		readInstalledVersion('@maxal_studio/kratosjs-hapi') ??
			readMonorepoVersion('packages/kratosjs-hapi') ??
			readPublishedVersion('@maxal_studio/kratosjs-hapi'),
	);
}

/** Resolve a semver range for @maxal_studio/kratosjs-koa (an alternative HTTP adapter). */
export function kratosKoaDep(local: boolean): string {
	if (local) {
		return 'file:../packages/kratosjs-koa';
	}

	return toVersionRange(
		readInstalledVersion('@maxal_studio/kratosjs-koa') ??
			readMonorepoVersion('packages/kratosjs-koa') ??
			readPublishedVersion('@maxal_studio/kratosjs-koa'),
	);
}
