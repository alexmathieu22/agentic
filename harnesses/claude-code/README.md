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

Requires `npx`, `claude` and `python3` on `PATH`; it fails immediately if any is
missing. Node is pinned in the repo's `.tool-versions`; `claude` can't be pinned
(no asdf plugin), so the script only checks it exists.

**Skills are copied** by `npx skills add -g`: rerun the script after editing a
skill. Idempotent.

`AGENTIC_STATE` overrides the manifest location. To test against a throwaway
home, set `HOME` — `npx skills` writes to `~/.claude/skills` regardless of
`CLAUDE_HOME`.

### Keeping it up to date

Installed skills are copies, so **after editing a skill, run `install.sh`**
before expecting a session to see the change.

To rerun it automatically after merges and rebases (which is what `git pull`
does), enable the hooks once per clone:

```bash
git config core.hooksPath harnesses/claude-code/githooks
```

`post-merge` and `post-rewrite` (rebases only; amends don't trigger it) run
`install.sh` after **any** merge or rebase in the main checkout, pulled or local
(a `git rebase -i` to tidy commits triggers it too), and first run
`npx skills experimental_install` if `.agents/skills/` is missing or the pull
changed `skills-lock.json`. They do
nothing in a worktree: `install.sh` writes the checkout's path into
`~/.claude/CLAUDE.md`, so a worktree would repoint your global memory at itself.
A failure prints a message and never blocks the pull. Editing a skill locally
triggers nothing — there is no git event for it.

**Trust:** enabling `core.hooksPath` means a pull runs the pulled tree's
`install.sh` and hooks without review. Git doesn't version hooks for this reason;
that is acceptable for a repo only you write to, and worth revisiting if others
can push.

---

## What gets installed

| Content | Lands at | How |
|---|---|---|
| Skills | `~/.claude/skills/<name>/` | `npx skills add -g -a claude-code`, copied |
| Contexts | `~/.claude/CLAUDE.md` | generated file of `@` imports |
| MCP servers | user scope | `claude mcp add -s user` |
| Plugins | user scope | `claude plugin marketplace add` + `claude plugin install`, see below |

### Flattening

Claude Code scans **one flat
directory per kind**. So the layers are flattened at install: every skill from
every layer lands directly in `~/.claude/skills/`.

That is exactly why skill names must be unique repo-wide. The script aborts if
two sources — two layers, or a layer and a third-party skill — share a name.

### Third-party skills

Added by hand, once, from inside the repo:

```bash
npx skills add mattpocock/skills --skill tdd -a universal --copy
```

`-a universal` keeps `npx` to `.agents/skills/` — without it, `npx` writes into
every supported agent's folder. The command records the source in
`skills-lock.json` (committed); the copies in `.agents/skills/` are gitignored.
`install.sh` then installs them globally from there, for Claude Code only. On a
fresh checkout run `npx skills experimental_install` first to restore
`.agents/skills/` from the lock. `npx skills update -p` moves them to the latest
upstream; the lock holds a hash, not a pinned commit.

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
- A skill whose name exists in `~/.claude/skills/` but was not installed by
  `npx skills` is a conflict. `npx skills add` would overwrite it silently, so
  the script checks first.
- Uninstall removes every global skill whose recorded source is this repo, via
  `npx skills remove -g`. A skill later deleted from the repo is only reported,
  not removed, on install.
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

### MCP servers needing sign-in

Remote servers in `mcp/servers.json` (`"type": "http"`) are registered with
`claude mcp add -s user --transport http`. That only registers them; **sign in
once by hand**: open a Claude Code session, run `/mcp`, pick the server and
finish the browser OAuth flow. Tokens stay in Claude Code, never in the repo.

Linear (`https://mcp.linear.app/mcp`) is read-write. For read-only, change the
URL to `https://mcp.linear.app/mcp/readonly`, then
`claude mcp remove linear -s user` and rerun `install.sh` (an existing
registration is not updated).

The `design` plugin also bundles its own `linear` server. If `/mcp` lists both,
authorize one and ignore the other.

---

## Verifying

```bash
harnesses/claude-code/install.sh --dry-run
```

Then in a new session, a skill should fire without being named — describe a code review situation in your own
words and see whether `alex-code-review` triggers. That last one is the real test;
the rest only prove files are in place.
