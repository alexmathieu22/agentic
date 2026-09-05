# Installing

Not settled yet — deliberately. The content is written to open formats precisely
so this decision stays open and reversible. This file records the constraint and
the options rather than pretending there's one answer.

---

## The constraint

Harnesses scan a **flat** skills directory — typically `~/.agents/skills/`,
`~/.claude/skills/`, `~/.cursor/skills/`. This repo nests by layer for human
legibility, so any install has to **flatten**:

```
domains/engineering/coding/skills/code-review/          ─┐
domains/engineering/product/skills/user-story-writing/  ─┼─▶ <target>/skills/<name>/
core/skills/skill-authoring/                            ─┘
```

That's why skill names must be unique repo-wide (see `docs/conventions.md`) —
flattening two layers with the same skill name loses one of them.

Everything else follows from that: `AGENTS.md` is read from the project or home
directory, MCP servers are per-harness config, and providers are environment
variables.

---

## Options

**Link the layers you want, by hand.** A loop per layer, symlinking each skill
folder into the target. Explicit, no dependency, and edits are live because
symlinks point back at the repo. Tedious once there are several targets.

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
