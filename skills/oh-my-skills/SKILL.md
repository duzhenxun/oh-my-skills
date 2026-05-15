---
name: oh-my-skills
description: Manage Oh My Skills from an agent or terminal. Use this when the user wants to start, stop, restart, inspect, install, edit, or automate local AI agent skills through the oh-my-skills CLI.
---

# Oh My Skills

Use the `oh-my-skills` or `oms` command to manage the local skill dashboard and call its APIs from an agent workflow.

## Install and Start

- `npx oh-my-skills@latest`: run the latest package directly.
- `npm i -g oh-my-skills`: recommended global install.
- `oh-my-skills` or `oms`: start the dashboard.
- `oms start --daemon --open`: start in the background and open the UI. Default port is 2525; if unavailable, the CLI uses the next free port.

## Service Control

- `oms stop --port 2525`: stop the local service.
- `oms restart --port 2525 --open`: restart the service.
- `oms status --port 2525`: check whether the service is responding.
- `oms open --port 2525`: open the dashboard.

## Skill Operations

- `oms skills list --json`: list local skills.
- `oms skills list --state enabled`: list enabled skills.
- `oms skills toggle --id <id> --enabled true`: enable a skill.
- `oms skills toggle --id <id> --enabled false`: disable a skill.
- `oms skills delete --id <id>`: delete a skill.
- `oms skills bulk --ids <id,id> --action enable`: bulk enable skills.

## Install Operations

- `oms hub search --query wiki-skill --json`: search SkillHub.
- `oms hub install --slug wiki-skill --destination global-agents`: install from SkillHub.
- `oms install manual --destination global-agents --name my-skill --file ./SKILL.md`: create a local skill from a file.
- `oms install repo --repo-url <url>`: list skills in a Git repository.
- `oms install repo --repo-url <url> --skill-name <name> --destination global-agents`: install a skill from a Git repository.
- `oms copy --id <id> --destination global-codex`: copy an existing skill to another destination.

## Project Operations

- `oms projects list --json`: list tracked projects.
- `oms projects list --discover --json`: scan for projects containing skill folders.
- `oms projects add --path /path/to/project`: track a project.
- `oms projects remove --path /path/to/project`: remove a tracked project.

## Raw API

Use `oms api <METHOD> <PATH> [--data <json>] [--json]` for any route exposed by the local service.

Examples:

- `oms api GET /api/skills --json`
- `oms api POST /api/install/hub-search --data '{"query":"wiki-skill"}' --json`

## Install This Agent Skill

When the user asks to install the Oh My Skills agent skill, run:

```bash
oh-my-skills --install
```

This copies the bundled skill to:

```text
~/.agents/skills/oh-my-skills/SKILL.md
```
