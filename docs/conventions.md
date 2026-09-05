# Conventions

Normative reference for every file format in this repo. `AGENTS.md` is the
summary; this is the detail and the reasoning.

---

## Layers

Content lives in layers. `core/` applies to every session; each pack under
`domains/` is self-contained and adoptable on its own.

```
core/                                   applies everywhere
domains/<area>/<kind>/                  e.g. engineering/coding
```

Top-level domains are **areas of life** (`engineering/`, later `life/`,
`research/`); the level below is a **kind of work** within that area
(`coding/`, `architecture/`, `product/`, `delivery/`).

A layer contains any of `skills/`, `contexts/`, `agents/`, `commands/`. All
four are optional — `domains/engineering/delivery/` has only skills and a command.

Adding a layer means creating the directory. Layers never reference each other,
so one can be adopted, moved, or deleted without touching the rest.

**Nesting is for humans, not for harnesses.** Harnesses scan a single flat
skills directory, so an install flattens layers together. That has one hard
consequence, below.

---

## Skills — `<layer>/skills/<name>/SKILL.md`

Conforms to the [Agent Skills specification](https://agentskills.io). Two fields
are required; everything else is optional. `x-` keys are this repo's extensions
and are ignored by harnesses that don't know them.

```yaml
---
name: code-review                # REQUIRED. lowercase, digits, single hyphens, <=64 chars.
                                 # MUST equal the folder name.
description: >                   # REQUIRED. Say WHEN to use this.
  Use when reviewing a diff, pull request, or code you just wrote, to find
  correctness bugs before style issues and to say plainly what would break.
x-domain: engineering.coding     # MUST match the layer path, dot-separated
x-requires: [git]                # binaries assumed present
---

Markdown instructions.
```

Optional supporting directories inside the skill folder:

```
<name>/
├── SKILL.md          # required
├── references/       # long docs, loaded only when the body says to
├── scripts/          # executables the skill may run
└── templates/
```

### The two naming rules, and why

1. **Folder name must equal `name`.** The spec requires it. Harnesses that
   disagree with the frontmatter skip the skill silently — no error, it simply
   never exists.

2. **Names must be unique across the entire repo**, not per layer. Installing
   two layers flattens their skills into one directory, so
   `engineering/coding/review` and `engineering/product/review` would collide
   and one would win non-deterministically.

`x-domain` is what survives flattening — it's how an installed skill can be
traced back to the layer it came from.

### Writing a description

At startup a harness loads **only** the frontmatter, budgeting roughly 100
tokens per skill, and decides relevance from that alone. A description that
names the topic ("Kubernetes debugging tips") will not fire reliably. One that
names the trigger ("Use when reviewing a diff or pull request…") will.

Name the situations, artifacts, and words someone would actually say. If two
skills could both fire, make each description say what the *other* is for.

### Progressive disclosure

Frontmatter at startup → body when the skill fires → `references/` only when the
body explicitly says to read a file. Keep `SKILL.md` under ~200 lines and push
detail into `references/`.

---

## Contexts — `<layer>/contexts/<name>.md`

Plain markdown, no frontmatter. Composed into a project's `AGENTS.md`.

Contexts hold what is **always true**. Anything conditional or procedural is a
skill instead — contexts cost tokens on every single turn, skills cost nothing
until they fire.

`core/contexts/base.md` applies everywhere; the rest are opt-in per project.

---

## Agents — `<layer>/agents/<name>.md`

No cross-vendor standard exists for subagents, so this is a local schema kept
deliberately close to what most harnesses accept.

```yaml
---
name: reviewer
description: >                      # REQUIRED. Must say when NOT to delegate — see below.
  Reviews a diff for correctness first, then reuse and clarity. Worth delegating
  to when an independent read matters. Not for reading a file or explaining
  what a change does.
x-tools: [read, grep, glob, bash]   # capability intents, not any harness's tool names
x-model: primary                    # fast | primary | deep — a tier, see providers/
x-skills: [code-review]
x-domain: engineering.coding
---

System prompt, opening with a **Not for:** line.
```

### Every agent must state when *not* to use it

A subagent is the most expensive rung in the ladder (`core/contexts/base.md`):
it starts cold, re-derives context the caller already has, and returns a summary
rather than the real output. The `description` is what a harness reads when
deciding whether to delegate, so the boundary has to live there — not only in
the body, which is read after the decision is already made.

Delegation earns its cost in exactly three cases: **context isolation**, a
**genuinely different posture**, or **real parallelism**. A persona is not a
reason. If none of the three hold, the work should be done directly.

`x-tools` are intents (`read`, `write`, `bash`, `web`), not tool names, because
every harness names its tools differently. `x-model` is a tier, not a model id,
so the same agent works on DeepSeek, Anthropic or a local model.

A harness without subagents can consume these as ordinary skills.

---

## Commands — `<layer>/commands/<name>.md`

```yaml
---
name: review
description: One line.
x-args: "[base-ref]"
x-domain: engineering.coding
---

Prompt body. `$ARGS` is the invocation arguments.
```

Harnesses without slash commands can consume these as skills too.

---

## MCP servers — `mcp/servers.json`

Repo-wide, not per layer — a tool server is a machine capability, not a domain.

JSON rather than YAML because most harnesses' own MCP config is JSON, which
makes copying an entry a paste rather than a conversion.

```json
{
  "mcpServers": {
    "cachebro": {
      "command": "npx",
      "args": ["cachebro", "serve"],
      "x-domains": ["engineering.coding"],
      "x-scope": "global"
    }
  }
}
```

Secrets are written as `${VAR_NAME}` and resolved from the environment by the
harness. Never a literal value.

---

## Providers — `providers/<name>.env.example`

One file per backend. Plain shell, sourceable by anything:

```sh
export DEEPSEEK_BASE_URL="https://api.deepseek.com"
export DEEPSEEK_API_KEY="__SET_ME__"
export AGENT_MODEL_FAST="deepseek-v4"
export AGENT_MODEL_PRIMARY="deepseek-v4-pro"
export AGENT_MODEL_DEEP="deepseek-v4-pro"
```

`AGENT_MODEL_{FAST,PRIMARY,DEEP}` are this repo's tier names, matching `x-model`
in agent definitions. A harness that reads model names from the environment
picks these up; one that doesn't takes the values pasted into its config once.

**Real values never enter this repo.** Copy an example to
`~/.config/agents/<name>.env`, `chmod 600`, fill it in, source it.

---

## The one tool-specific file

`CLAUDE.md` contains a single line, `@AGENTS.md`. Claude Code is currently the
only mainstream harness that does not read `AGENTS.md` natively, and this
one-line import is the documented bridge. It is the sole concession in the repo,
and it costs nothing to delete.
