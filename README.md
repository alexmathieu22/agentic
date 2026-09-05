# agentic

My agent setup, kept portable on purpose.

Agent tooling churns fast. Anything written against a single tool's config
format is a migration waiting to happen — so everything durable here is written
to open, vendor-neutral standards, and nothing in the repo knows which harness
will read it.

| Standard | Used for | Governance |
|---|---|---|
| [AGENTS.md](https://agents.md) | instructions | Agentic AI Foundation (Linux Foundation) |
| [MCP](https://modelcontextprotocol.io) | tool servers | Agentic AI Foundation (Linux Foundation) |
| [Agent Skills](https://agentskills.io) | procedures | open spec, originated by Anthropic |

The [AAIF](https://aaif.io) was formed in December 2025 when three competing
vendors donated their formats to a neutral foundation — MCP from Anthropic,
AGENTS.md from OpenAI, goose from Block — with AWS, Google, Microsoft,
Cloudflare and Bloomberg among the platinum members. That is the actual reason
this bet is reasonable: no single vendor can now unilaterally change or retire
these formats.

## Layers

`core/` applies everywhere. Each domain pack is self-contained and can be
adopted without the others.

```
core/                          base working agreement, skill-authoring
domains/
└── engineering/               the software life-area
    ├── coding/                code-review, test-first, refactor-safely,
    │                          debug-systematically, dependency-audit
    │                          agents: reviewer, debugger · cmd: review
    ├── architecture/          domain-driven-design, adr-writing, api-design
    │                          agents: architect
    ├── product/               product-discovery, user-story-writing,
    │                          acceptance-criteria
    │                          agents: product-owner · cmd: refine
    └── delivery/              plan-then-build, incident-response
                               cmd: plan
```

Top-level domains are **areas of life**. `life/`, `research/`, `finance/` slot
in beside `engineering/` when they're needed; kinds of work go one level down.

Each layer holds any of `skills/`, `contexts/`, `agents/`, `commands/`.

## Repo-wide

| Path | What |
|---|---|
| `mcp/servers.json` | Every tool server, defined once |
| `providers/` | Model endpoints per backend, as env files. **Names only, never values.** |
| `docs/conventions.md` | Normative schemas |
| `docs/install.md` | Getting content into a harness |
| `templates/` | Scaffolds for new skills, agents, commands |

## Provider independence

`providers/` describes each backend as a plain `.env` file — DeepSeek,
OpenRouter, Anthropic, local. Every one sets the same
`AGENT_MODEL_{FAST,PRIMARY,DEEP}`, so agent definitions name a *tier* rather
than a model and stay portable. Switching backend is sourcing a different file.

## Install

Not settled yet — see [`docs/install.md`](docs/install.md) for the constraint
that matters (harnesses want a flat skills directory) and the options.

## Conventions

[`docs/conventions.md`](docs/conventions.md) is normative. [`AGENTS.md`](AGENTS.md)
is the short version an agent reads before editing.
