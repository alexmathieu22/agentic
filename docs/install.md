# Installing

One harness is wired (`dsh`); the rest are deliberately still open. The content
is written to open formats precisely so this stays reversible. This file records
the constraint and the options rather than pretending there is one answer for
every harness.

---

## Solved

| Harness | How | Flattens? |
|---|---|---|
| [`dsh`](../harnesses/dsh/README.md) | `customSkillDirs` takes a list of roots | No — layers stay as they are |
| [`claude-code`](../harnesses/claude-code/README.md) | `install.sh`, symlinks | Yes — it scans one flat directory per kind |

The two harnesses answer the constraint below differently, which is the point
of keeping the content neutral: `dsh` is configured to read the layers in
place, Claude Code needs them flattened, and neither fact appears anywhere in
the content itself.

Everything else is still open.

## The constraint

Harnesses scan a **flat** skills directory — typically `~/.agents/skills/`,
`~/.claude/skills/`, `~/.cursor/skills/`. This repo nests by layer for human
legibility, so any install has to **flatten**:

```
domains/engineering/coding/skills/code-review/          ─┐
domains/engineering/product/skills/user-story-writing/  ─┼─▶ <target>/skills/<name>/
core/skills/agentic-authoring/                          ─┘
```

That's why skill names must be unique repo-wide (see `docs/conventions.md`) —
flattening two layers with the same skill name loses one of them.

Everything else follows from that: `AGENTS.md` is read from the project or home
directory, MCP servers are per-harness config, and providers are environment
variables.

---

## Options

**Write an install script for it**, as `harnesses/<name>/install.sh`. That is
what Claude Code has: symlinks, a manifest of everything it created, an
uninstall that reverses exactly that, and a refusal to touch anything it did
not make. Copy it as the starting point for another harness.

**Adopt an existing manager.** Several already do this fan-out and can treat
this repo as the source:

| Tool | Approach |
|---|---|
| [ai-rulez](https://github.com/Goldziher/ai-rulez) | Generates native configs for 20+ tools; `verify` command for CI |
| [block/ai-rules](https://github.com/block/ai-rules) | Generate or symlink; from Block, who maintain Goose |
| [ai-rules-sync](https://github.com/lbb00/ai-rules-sync) | Symlinks from a git repo — closest to this repo's shape |
| [Vercel `skills`](https://github.com/vercel-labs/skills) | Package manager for skills; `npx skills add <local path>` fans out to 76+ agents |

The content doesn't change either way. That's the point of keeping it in the
standard formats.

---

## Extending in another repo

Independent of the install question, and already works today. Precedence is
**project over global** in every harness supporting both, so a project adds its
own and wins on name collisions:

```
your-repo/
├── AGENTS.md                    # project instructions
└── .agents/
    └── skills/
        └── <project-skill>/SKILL.md
```

**Project-specific skills stay in the project.** Cluster runbooks belong in
`home-ops/.agents/skills/`, not here — they'd never fire anywhere else, and
they'd cost startup budget in every unrelated session.
