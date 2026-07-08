---
title: Build with AI
---

# Build with AI

You can generate KratosJs admin panels with an AI coding assistant instead of writing every resource, form, and table by hand. The **[`@maxal_studio/kratosjs-skill`](https://www.npmjs.com/package/@maxal_studio/kratosjs-skill)** package installs a portable [Agent Skill](https://agentskills.io) that teaches your assistant the framework's current conventions — and the non-obvious gotchas that aren't easy to infer from the API alone.

Once installed, you describe what you want:

> _Add a `Product` resource with a relation to `Brand`, a stats widget for total revenue, and an "activate" bulk action._

…and the assistant scaffolds the entity, resource, form, table, relation, widget, and action following the verified patterns from this documentation — instead of guessing at the API.

## Install

Run the installer with `npx` — no global install needed:

```bash
# Installs to Claude Code (.claude/skills) AND the universal .agents/skills location
npx @maxal_studio/kratosjs-skill
```

That single command covers Claude Code plus every tool that reads the standard `.agents/skills/` directory. To target one tool, pass its name:

```bash
npx @maxal_studio/kratosjs-skill claude      # Claude Code
npx @maxal_studio/kratosjs-skill agents      # universal .agents/skills (Codex, Cursor, VS Code, Gemini…)
npx @maxal_studio/kratosjs-skill cursor      # Cursor's own .cursor/skills
npx @maxal_studio/kratosjs-skill vscode      # VS Code / Copilot (.github/skills)
npx @maxal_studio/kratosjs-skill gemini      # Gemini CLI (.gemini/skills)
```

Useful flags:

| Flag           | Effect                                                          |
| -------------- | --------------------------------------------------------------- |
| `--global`     | Install into your home directory instead of the current project |
| `--dir <path>` | Copy into an exact directory (skill lands at `<path>/kratosjs`) |
| `--force`      | Overwrite an existing install                                   |

## Supported tools

Agent Skills are an **open standard** supported by 40+ tools — Claude Code, Cursor, VS Code / GitHub Copilot, OpenAI Codex, Gemini CLI, opencode, Roo Code, Kiro, Junie, Amp, and more. The same skill folder works everywhere; only the install location differs:

| Tool                                                | Project directory | Home directory       |
| --------------------------------------------------- | ----------------- | -------------------- |
| Claude Code                                         | `.claude/skills/` | `~/.claude/skills/`  |
| Any standard tool (Codex, Cursor, VS Code, Gemini…) | `.agents/skills/` | `~/.agents/skills/`  |
| Cursor (native)                                     | `.cursor/skills/` | `~/.cursor/skills/`  |
| VS Code / Copilot                                   | `.github/skills/` | `~/.copilot/skills/` |
| Gemini CLI                                          | `.gemini/skills/` | `~/.gemini/skills/`  |

## How it works

The assistant loads the skill automatically when you work on a KratosJs panel — its description matches requests like "add a resource", "build a form or table", or "create a widget". In tools that support slash-invocation you can also call it explicitly with `/kratosjs`.

It uses **progressive disclosure**: a short `SKILL.md` router points to detailed reference files that load only when the task needs them, so it costs almost nothing until used. The content is grounded in the same verified patterns documented across this site — resources, forms, tables, hooks, actions, widgets, pages, relations, media, auth, i18n, and plugins.

## Next steps

- [Getting Started](/getting-started) — scaffold an app to point your assistant at
- [Creating Resources](/resources/overview) — the patterns the skill encodes
- [Package README](https://www.npmjs.com/package/@maxal_studio/kratosjs-skill) — full per-tool details
