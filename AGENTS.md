# AGENTS.md

Alexandre's portable agent setup. Written once, in open standards, so it works
with whatever harness and whatever model provider is current.

This file is the entry point most coding agents read on their own. It is also
what an agent should read before editing anything in this repo.

## Structure

Content is organised into **layers**. `core/` applies everywhere; each domain
under `domains/` is a self-contained pack that can be adopted on its own.

```
core/                        applies to every session
domains/
└── engineering/             the software life-area
    ├── coding/              writing, reviewing, debugging, changing code
    ├── architecture/        boundaries, models, contracts, decisions
    ├── product/             problems, stories, acceptance
    └── delivery/            planning work and running incidents
```

Top-level domains are **areas of life**, not kinds of work — `life/`,
`research/`, `finance/` become siblings of `engineering/` when they're needed.
Kinds of work are the level below.

Every layer holds the same four kinds of thing, all optional:

| Directory | Contents | Standard |
|---|---|---|
| `skills/` | Repeatable procedures, one folder each | [Agent Skills](https://agentskills.io) |
| `contexts/` | Always-on guidance, composed into a project `AGENTS.md` | AGENTS.md fragments |
| `agents/` | Subagent personas | markdown + frontmatter |
| `commands/` | Prompt macros | markdown + frontmatter |

Repo-wide, outside the layers: `mcp/` (tool servers), `providers/` (model
endpoints), `config/` (durable preferences such as git host), `harnesses/`
(per-harness wiring), `docs/`, `templates/`.

## Rules for editing

1. **No secrets, ever.** `providers/` holds `.env.example` files naming
   variables. Real values live in `~/.config/agents/` at mode 600, gitignored.

2. **A skill's folder name must equal its `name:` field.** The Agent Skills spec
   requires it and harnesses silently skip mismatches — no error, the skill just
   never exists.

3. **Skill names must be unique across the whole repo**, not just within a
   layer. Harnesses scan one flat skills directory, so installing more than one
   layer flattens them together. `engineering/coding/review` and
   `engineering/product/review` would collide.

4. **`description:` is the whole budget.** Only frontmatter is loaded at startup
   (~100 tokens per skill). If it doesn't say *when* to use the skill, the skill
   never fires. Write the trigger, not the topic.

5. **`x-domain:` must match the path** — `engineering.coding`, `engineering.product`, `core`.
   It's what lets a flattened install be traced back to its layer.

6. **No harness vocabulary in content, and the dependency runs one way.**
   Never write a tool's config shape into a skill, context or agent. Harness
   wiring lives in `harnesses/<name>/`, which may reference canonical content —
   canonical content may never reference a harness. Deleting any
   `harnesses/<name>/` must leave the repo whole.

7. **Nothing here is project-specific.** This repo owns cross-project
   capability. A skill only one repo will ever use belongs in that repo's own
   `.agents/skills/`, where it takes precedence anyway.

## Adding a layer

A new kind of work goes under an existing area: `domains/engineering/<name>/`.
A new area of life goes at the top: `domains/<area>/<kind>/`. Either way, create
the directory with whichever of `skills/ contexts/ agents/ commands/` it needs —
nothing else changes, because layers never reference each other.

## Conventions

`docs/conventions.md` is normative: every frontmatter field and file format,
with the reasoning.
