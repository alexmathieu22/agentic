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
| Contexts | `~/.claude/CLAUDE.md` | generated file of `@` imports |
| MCP servers | user scope | `claude mcp add -s user` |
| Plugins | user scope | `claude plugin marketplace add` + `claude plugin install`, see below |
| Hooks | `~/.claude/settings.json` | merged, see below |

### Flattening

Unlike `dsh` — which takes a list of roots — Claude Code scans **one flat
directory per kind**. So the layers are flattened at install: every skill from
every layer lands directly in `~/.claude/skills/`.

That is exactly why skill names must be unique repo-wide. Two layers with the
same skill name would collide here and one would silently win.

### Global memory, and what does *not* go in it

Claude Code reads `CLAUDE.md`, not `AGENTS.md`. What belongs in **global**
memory is the always-on guidance in `contexts/` — the working agreement, the
escalation ladder, the git rules. Those are true in every session.

`AGENTS.md` is deliberately **not** imported globally. It is about authoring
*this* repo — skill frontmatter, layer taxonomy, the one-way harness rule — and
importing it globally would carry all of that into every unrelated project, paid
for on every turn. Working inside this repo picks it up anyway, through the
repo's own `CLAUDE.md`.

The generated file imports rather than copies, so editing a context takes effect
immediately:

```markdown
<!-- managed by agentic: harnesses/claude-code/install.sh -->
# Global agent guidance

@<repo>/core/contexts/base.md
@<repo>/domains/engineering/coding/contexts/coding.md
```

`core` and `engineering.coding` are the default — Claude Code is a coding tool,
so its engineering and git rules hold in every session here. Other domain
contexts are opt-in, because a context costs tokens on every turn:

```bash
./install.sh --context core --context engineering.product
./install.sh --no-context
```

If `~/.claude/CLAUDE.md` already exists without the marker, it is yours: the
script prints the lines to add and moves on.

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

### Plugins

Installing `engineering.coding` (the default) also installs
[ponytail](https://github.com/DietrichGebert/ponytail) — a third-party plugin
that pushes the agent toward the smallest solution that works (YAGNI, stdlib
first, no unrequested abstractions) before it writes code. It's not repo
content: it's a Claude Code marketplace plugin, so it's wired here rather than
living in `domains/engineering/coding/`, which would put a harness-specific
plugin id into canonical content.

The script runs `claude plugin marketplace add DietrichGebert/ponytail`, then
`claude plugin install ponytail@ponytail -s user`; both are skipped if already
present, and skipped entirely if `engineering.coding` isn't selected. It does
not restart Claude Code — a running session needs a restart to pick the plugin
up.

Uninstalling it is manual, same as MCP servers: `claude plugin uninstall
ponytail`.

### Hooks

`settings.json` is shared — it already holds hooks this repo does not own. So
`merge-hooks.py` **merges** rather than overwrites: it marks its own entries
with `_source: agentic`, replaces only those on re-run, and leaves everything
else exactly as it was.

Backups are timestamped (`settings.json.20260905-210311.bak`) and never
overwritten. A fixed `.bak` is destroyed by the second run, which is precisely
when the original matters most.

**Unverified:** `_source` is a key this repo adds to Claude Code's own hook
entries. Whether unknown keys are tolerated has not been tested, because no hook
exists yet to trigger it. Confirm that before the first hook lands — a strict
parser would break `settings.json` for every session.

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
