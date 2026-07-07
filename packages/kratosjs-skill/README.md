# @maxal_studio/kratosjs-skill

A portable **[Agent Skill](https://agentskills.io)** that teaches AI coding assistants how to build [KratosJs](https://github.com/maxal-studio/kratosjs) admin panels — resources, forms, tables, hooks, actions, widgets, pages, relations, media, auth, i18n, and plugins — using the current, verified API and the non-obvious gotchas that aren't in the reference docs.

Agent Skills are an **open standard** supported by 40+ tools (Claude Code, Cursor, VS Code / GitHub Copilot, OpenAI Codex, Gemini CLI, opencode, Roo Code, Kiro, Junie, Amp, and more). The same skill folder works everywhere — only the install location differs.

## Install

Run the installer with `npx` (no global install needed):

```bash
# Installs to Claude Code (.claude/skills) AND the universal .agents/skills location
npx @maxal_studio/kratosjs-skill
```

That single command covers Claude Code plus every tool that reads the standard `.agents/skills/` directory (Codex, Cursor, VS Code/Copilot, Gemini CLI, …). To target one tool, pass its name:

```bash
npx @maxal_studio/kratosjs-skill claude      # Claude Code
npx @maxal_studio/kratosjs-skill agents      # universal .agents/skills (Codex, Cursor, VS Code, Gemini…)
npx @maxal_studio/kratosjs-skill cursor      # Cursor's own .cursor/skills
npx @maxal_studio/kratosjs-skill vscode      # VS Code / Copilot (.github/skills)
npx @maxal_studio/kratosjs-skill gemini      # Gemini CLI (.gemini/skills)
```

Flags:

| Flag           | Effect                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| `--global`     | Install into your home directory instead of the current project                               |
| `--dir <path>` | Copy into an exact directory (skill lands at `<path>/kratosjs`) — use for any tool not listed |
| `--force`      | Overwrite an existing install                                                                 |

Where each tool loads the skill from (project scope shown; add `--global` for the home variant):

| Tool                                                | Project directory | Home directory       |
| --------------------------------------------------- | ----------------- | -------------------- |
| Claude Code                                         | `.claude/skills/` | `~/.claude/skills/`  |
| Any standard tool (Codex, Cursor, VS Code, Gemini…) | `.agents/skills/` | `~/.agents/skills/`  |
| Cursor (native)                                     | `.cursor/skills/` | `~/.cursor/skills/`  |
| VS Code / Copilot                                   | `.github/skills/` | `~/.copilot/skills/` |
| Gemini CLI                                          | `.gemini/skills/` | `~/.gemini/skills/`  |

## Manual install (no npx)

The skill is just a folder — copy it wherever your tool reads skills from:

```bash
cp -r node_modules/@maxal_studio/kratosjs-skill/skill/kratosjs  <your-tool-skills-dir>/kratosjs
```

For example, `.claude/skills/kratosjs` for Claude Code, or `.agents/skills/kratosjs` for Codex/Cursor/VS Code/Gemini. If your tool isn't listed above, check its docs (linked from [agentskills.io](https://agentskills.io)) for its skills directory and copy the `kratosjs/` folder there.

## Using it

Once installed, the assistant loads the skill automatically when you work on a KratosJs panel (its `description` matches requests like "add a resource", "build a form/table", "create a widget"). You can also invoke it explicitly with `/kratosjs` in tools that support slash-invocation.

The skill uses **progressive disclosure**: `SKILL.md` is a short router; the detailed material in `skill/kratosjs/references/*.md` loads only when the task needs it, so it costs almost nothing until used.

## What's inside

```
skill/kratosjs/
├── SKILL.md              # router: overview + when-to-load table + top gotchas
└── references/
    ├── getting-started.md   entities.md   resources.md   forms.md
    ├── tables.md            filters.md    cells.md       hooks.md
    ├── actions.md           widgets.md    pages.md       relations.md
    ├── media.md             auth.md       i18n.md        plugins.md
    └── gotchas.md
```
