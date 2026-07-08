#!/usr/bin/env node
// Locks all publishable @maxal_studio/* packages to a single, shared version.
//
// Usage:
//   node scripts/version.mjs patch|minor|major   # bump from the current root version
//   node scripts/version.mjs 1.4.0               # set an explicit version
//   node scripts/version.mjs patch --dry-run     # preview without writing
//
// Bumps the root package + every package under packages/* in lockstep and keeps
// internal @maxal_studio/* semver ranges (e.g. peerDependencies) pointed at the
// new version. Workspace links (file:/workspace:/*) and examples/* are left alone.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bump = args.find(a => !a.startsWith('--'));

if (!bump) {
	console.error('Usage: node scripts/version.mjs <patch|minor|major|x.y.z> [--dry-run]');
	process.exit(1);
}

// Collect the root package + each packages/* package (skip examples/*).
const manifestPaths = [join(root, 'package.json')];
const packagesDir = join(root, 'packages');
for (const name of readdirSync(packagesDir)) {
	const p = join(packagesDir, name, 'package.json');
	if (existsSync(p)) manifestPaths.push(p);
}

const read = p => JSON.parse(readFileSync(p, 'utf8'));

// Every @maxal_studio/* package name we manage, so we know which ranges to sync.
const managedNames = new Set(manifestPaths.map(p => read(p).name));

// Derive the next version from the CURRENT root version (the single source of truth).
const current = read(manifestPaths[0]).version;
const next = resolveVersion(current, bump);

function resolveVersion(from, spec) {
	if (/^\d+\.\d+\.\d+$/.test(spec)) return spec;
	const [maj, min, pat] = from.split('.').map(Number);
	if (spec === 'major') return `${maj + 1}.0.0`;
	if (spec === 'minor') return `${maj}.${min + 1}.0`;
	if (spec === 'patch') return `${maj}.${min}.${pat + 1}`;
	console.error(`Invalid version spec: ${spec} (use patch|minor|major or x.y.z)`);
	process.exit(1);
}

console.log(`Locking all packages: ${current} -> ${next}${dryRun ? ' (dry run)' : ''}\n`);

for (const p of manifestPaths) {
	const pkg = read(p);
	const changes = [];

	if (pkg.version !== next) {
		changes.push(`version ${pkg.version} -> ${next}`);
		pkg.version = next;
	}

	// Sync internal @maxal_studio/* semver ranges to ^<next>; skip workspace links.
	for (const field of ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies']) {
		const deps = pkg[field];
		if (!deps) continue;
		for (const name of Object.keys(deps)) {
			if (!managedNames.has(name)) continue;
			const range = deps[name];
			if (/^(file:|link:|workspace:|\*$)/.test(range)) continue; // leave workspace links untouched
			const wanted = `^${next}`;
			if (range !== wanted) {
				changes.push(`${field}.${name} ${range} -> ${wanted}`);
				deps[name] = wanted;
			}
		}
	}

	const rel = p.slice(root.length + 1);
	if (changes.length === 0) {
		console.log(`  ${rel}: already up to date`);
		continue;
	}
	console.log(`  ${rel}:\n    ${changes.join('\n    ')}`);
	if (!dryRun) writeFileSync(p, JSON.stringify(pkg, null, '\t') + '\n');
}

if (dryRun) {
	console.log('\nDry run — no files written.');
	process.exit(0);
}

console.log(`\nAll packages locked at ${next}.`);

// Refresh the lockfile and rebuild so package-lock.json and dist reflect the new version.
const run = (cmd, cmdArgs) => {
	console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
	execFileSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit' });
};

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run(npm, ['install']);
run(npm, ['run', 'build']);

console.log(`\nDone — packages locked at ${next}, lockfile refreshed, build complete.`);
console.log('Next: commit the changes, then "npm run release".');
