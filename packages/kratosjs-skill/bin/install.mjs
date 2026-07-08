#!/usr/bin/env node
// Installer for the KratosJs Agent Skill.
//
// Copies the portable `skill/kratosjs/` folder into the skills directory of whichever
// AI coding tool you use. The skill itself follows the open Agent Skills standard
// (agentskills.io), so one folder works across every compatible tool — only the install
// location differs. With no tool argument it installs to BOTH the Claude Code location
// (`.claude/skills`) and the universal `.agents/skills` location that Codex, Cursor,
// VS Code/Copilot and Gemini CLI all read.
//
// Usage:
//   npx @maxal_studio/kratosjs-skill [tool] [--global] [--dir <path>] [--force]
//
//   tool      claude | agents | cursor | codex | vscode | gemini   (default: claude + agents)
//   --global  install into the home-directory location instead of the current project
//   --dir     copy into an exact directory (the skill lands at <dir>/kratosjs)
//   --force   overwrite an existing install

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const SKILL_NAME = 'kratosjs';
const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '..', 'skill', SKILL_NAME);

// tool -> { project, global } skills-root (relative to cwd / absolute for global).
// `.agents/skills` is the cross-tool standard read by Codex, Cursor, VS Code and Gemini CLI.
const TOOLS = {
	claude: { project: '.claude/skills', home: '.claude/skills' },
	agents: { project: '.agents/skills', home: '.agents/skills' },
	cursor: { project: '.cursor/skills', home: '.cursor/skills' },
	codex: { project: '.agents/skills', home: '.agents/skills' },
	vscode: { project: '.github/skills', home: '.copilot/skills' },
	copilot: { project: '.github/skills', home: '.copilot/skills' },
	gemini: { project: '.gemini/skills', home: '.gemini/skills' },
};

function parseArgs(argv) {
	const opts = { tools: [], global: false, dir: null, force: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--global' || arg === '-g') opts.global = true;
		else if (arg === '--force' || arg === '-f') opts.force = true;
		else if (arg === '--dir') opts.dir = argv[++i];
		else if (arg === '--help' || arg === '-h') opts.help = true;
		else if (arg.startsWith('-')) fail(`Unknown flag: ${arg}`);
		else opts.tools.push(arg.toLowerCase());
	}
	return opts;
}

function fail(msg) {
	console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
	process.exit(1);
}

function printHelp() {
	console.log(`
KratosJs Agent Skill installer

  npx @maxal_studio/kratosjs-skill [tool] [--global] [--dir <path>] [--force]

Tools:   claude, agents, cursor, codex, vscode, gemini
         (no tool = install to Claude Code + the universal .agents/skills location)

Flags:
  --global   install into your home directory instead of this project
  --dir      copy into an exact directory (skill lands at <dir>/${SKILL_NAME})
  --force    overwrite an existing install

The .agents/skills location is read by Codex, Cursor, VS Code/Copilot and Gemini CLI.
For any other tool, use --dir with that tool's skills folder (see README).
`);
}

function installInto(root, label) {
	const dest = join(root, SKILL_NAME);
	if (existsSync(dest)) {
		if (!opts.force) {
			console.log(`\x1b[33m• ${label}: already installed at ${dest} (use --force to overwrite)\x1b[0m`);
			return false;
		}
		rmSync(dest, { recursive: true, force: true });
	}
	mkdirSync(root, { recursive: true });
	cpSync(SOURCE, dest, { recursive: true });
	console.log(`\x1b[32m✔ ${label}: installed to ${dest}\x1b[0m`);
	return true;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
	printHelp();
	process.exit(0);
}

if (!existsSync(join(SOURCE, 'SKILL.md'))) {
	fail(`Could not find the skill source at ${SOURCE}`);
}

const base = opts.global ? homedir() : process.cwd();
const targets = [];

if (opts.dir) {
	// Explicit directory wins; ignore the tool map.
	targets.push({ root: resolve(opts.dir), label: opts.dir });
} else {
	// Default (no tool): Claude Code + universal .agents.
	const tools = opts.tools.length ? opts.tools : ['claude', 'agents'];
	for (const tool of tools) {
		const entry = TOOLS[tool];
		if (!entry) {
			fail(`Unknown tool "${tool}". Known: ${Object.keys(TOOLS).join(', ')}. Or use --dir <path>.`);
		}
		const rel = opts.global ? entry.home : entry.project;
		targets.push({ root: join(base, rel), label: tool });
	}
}

console.log(`\nInstalling the KratosJs skill (${opts.global ? 'global' : 'project'})...\n`);
let installed = 0;
for (const t of targets) if (installInto(t.root, t.label)) installed++;

console.log(
	installed
		? `\n\x1b[1mDone.\x1b[0m Restart your AI tool if it was running, then ask it to build a KratosJs resource — or invoke /${SKILL_NAME} where supported.\n`
		: `\nNothing installed. Re-run with --force to overwrite existing installs.\n`,
);
