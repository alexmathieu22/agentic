# Claude Code

Wiring for [Claude Code](https://claude.com/claude-code).

This directory may read the canonical content in this repo. **The canonical
content must never reference this directory.** Delete `harnesses/claude-code/`
and the repo is still whole; only the wiring is gone.

---

## Install

```bash
harnesses/claude-code/install.sh
```

| Flag | |
|---|---|
| `--dry-run` | Show what would happen, touch nothing |
| `--uninstall` | Remove exactly what the script created |
| `--force` | Replace paths the script did not create |

Symlinks, so edits in the repo are live — no reinstall after changing a skill.
Idempotent: run it as often as you like.

`CLAUDE_HOME` and `AGENTIC_STATE` override the targets, which is how the script
is tested against a throwaway home.

---

## What gets installed

| Content | Lands at | How |
|---|---|---|
| Skills | `~/.claude/skills/<name>/` | symlink per skill |
| Agents | `~/.claude/agents/<name>.md` | symlink per file |
| Commands | `~/.claude/commands/<name>.md` | symlink per file |
| Instructions | `~/.claude/CLAUDE.md` | `@<repo>/AGENTS.md` import |
| MCP servers | user scope | `claude mcp add -s user` |
| Hooks | `~/.claude/settings.json` | merged, see below |

### Flattening

Unlike `dsh` — which takes a list of roots — Claude Code scans **one flat
directory per kind**. So the layers are flattened at install: every skill from
every layer lands directly in `~/.claude/skills/`.

That is exactly why skill names must be unique repo-wide. Two layers with the
same skill name would collide here and one would silently win.

### Instructions

Claude Code reads `CLAUDE.md`, not `AGENTS.md`. The documented bridge is a
one-line import, so `~/.claude/CLAUDE.md` points at this repo rather than
duplicating it — edit `AGENTS.md` and Claude Code sees it.

If you already have a `~/.claude/CLAUDE.md` with your own content, the script
will not touch it; it prints the line to add and moves on.

---

## Safety

The script never removes anything it did not create.

- Every path it writes is recorded in `~/.config/agents/claude-code.manifest`,
  and `--uninstall` reverses exactly that list.
- A path that exists and is not ours is reported as a **conflict** and skipped.
  `--force` is the only way past it. This is what protects the `world-builder`
  skill already sitting in `~/.claude/skills/`.
- Uninstall removes the `CLAUDE.md` bridge only while it contains nothing but
  the import line. Edit it and it becomes yours; uninstall leaves it alone.

### Hooks

`settings.json` is shared — it already holds hooks this repo does not own. So
`merge-hooks.py` **merges** rather than overwrites: it backs the file up, marks
its own entries with `_source: agentic`, replaces only those on re-run, and
leaves everything else exactly as it was.

Neutral event names map onto Claude Code's:

| `hooks/<name>.sh` | Claude Code event |
|---|---|
| `session-start` | `SessionStart` |
| `session-end` | `SessionEnd` |
| `user-prompt` | `UserPromptSubmit` |
| `pre-tool` | `PreToolUse` |
| `post-tool` | `PostToolUse` |
| `notify` | `Notification` |
| `stop` | `Stop` |

**Currently a no-op.** `hooks/` holds the contract and no executables — no hook
has earned its place yet. The path is built and tested; it wires nothing until
there is something worth wiring.

---

## Verifying

```bash
harnesses/claude-code/install.sh --dry-run
```

Then in a new session: `/pr` and `/review` should be available, and a skill
should fire without being named — describe a code review situation in your own
words and see whether `code-review` triggers. That last one is the real test;
the rest only prove files are in place.
