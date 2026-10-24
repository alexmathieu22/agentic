# Hub

Local dashboard: what you're working on, what needs you, today's vault notes.
No dependencies, no build step (Node 22).

```bash
node apps/hub/server.mjs        # http://localhost:4173
node --test apps/hub/today.test.mjs apps/hub/lib.test.mjs apps/hub/vault.test.mjs
```

Pages: **Today** (a to-do tile from the vault's `Life/Personal todo.md` or `Job/Job todo.md`, unchecked `- [ ]` items only, with a pen that opens the note in Obsidian; on the job tab, tiles for yesterday's recap and today's, with a "Draft with Claude" button when today's doesn't exist yet; then what needs you, sessions to pick up, glance blocks), **Work** (all activity, or one
project's ticket board and its sessions), and **Running** / **Budget** in contexts that list those
panels. ⌘K or `/` searches everything. Each page is a module in `public/pages/`.

Sources live in `sources/`, one module each exporting `load()`. A failing source shows as an
orange pill and never blanks the page.

**Open in Claude** uses `claude://code/continue?session=local_…`, read from Claude Desktop's own
link handler and its session files in `~/Library/Application Support/Claude/claude-code-sessions/`.
It is undocumented, so it may break on a Desktop update; sessions without a Desktop id fall back to
the documented `claude://code/new?folder=…`.

| Source | Needs |
|---|---|
| `sessions` | Claude Code transcripts in `~/.claude/projects` |
| `github` | `gh` logged in |
| `linear` | `LINEAR_API_KEY` env var, or the key in `~/.config/agents/linear-api-key` (mode 600) |
| `vault` | `OBSIDIAN_VAULT_PATH` (default `~/Repos/obsidian`) |

Jira, GitLab and Copilot sessions slot in as new modules beside these.

## Personal vs job

Tabs come from `~/.config/agents/hub.json` (per machine, outside the repo). Trackers and forges
listed under a context's `sources` claim their items and become that tab's status pills;
sessions fall into the first context. On the job computer, list `job` first:

```json
{
  "job": { "label": "Job", "sources": ["jira", "gitlab"] },
  "personal": { "label": "Personal", "sources": ["linear", "github"], "panels": ["running", "budget"] }
}
```

A context can name each project's tracker, keyed by repo name in lower case, so a project with no
open tickets still shows the right board. Without it, a project with Linear tickets uses Linear and
the rest use their GitHub issues:

```json
"personal": { "label": "Personal", "sources": ["linear", "github"], "trackers": { "kinovember": "linear" } }
```
