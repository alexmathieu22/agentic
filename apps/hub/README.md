# Hub

Local dashboard: what you're working on, what needs you, today's vault notes.
No dependencies, no build step (Node 22).

```bash
node apps/hub/server.mjs        # http://localhost:4173
node --test apps/hub/today.test.mjs
```

Sources live in `sources/`, one module each exporting `load()`. A failing source shows as an
orange pill and never blanks the page.

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
  "personal": { "label": "Personal", "sources": ["linear"], "panels": ["running", "budget"] }
}
```
