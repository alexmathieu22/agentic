# agentic

My agent setup, kept portable on purpose.

Agent tooling churns fast. Anything written against a single tool's config
format is a migration waiting to happen — so everything durable here is written
to open, vendor-neutral standards, and the content never names a harness.
Claude Code is the only harness wired today; others can be added later under
`harnesses/`.

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
core/                          base working agreement, agentic-authoring
domains/
└── engineering/               the software life-area
    ├── coding/                alex-code-review, test-first, refactor-safely,
    │                          debug-systematically, dependency-audit,
    │                          git-workflow, pull-request
    ├── architecture/          domain-driven-design, api-design
    ├── product/               product-discovery, user-story-writing,
    │                          acceptance-criteria
    └── delivery/              plan-then-build, incident-response
```

Top-level domains are **areas of life**. `life/`, `research/`, `finance/` slot
in beside `engineering/` when they're needed; kinds of work go one level down.

Each layer holds `skills/`, and optionally `contexts/`.

## Repo-wide

| Path | What |
|---|---|
| `config/` | Durable preferences skills read when they fire — git host, CLI, branch naming |
| `harnesses/` | Per-harness wiring (`claude-code`). Disposable — the dependency only runs this way |
| `mcp/servers.json` | Every tool server, defined once |
| `docs/conventions.md` | Normative schemas |
| `docs/install.md` | Getting content into a harness |
| `scripts/check.py` | Checks the silent-failure rules: skill names, `x-domain`, harness vocabulary. Run by CI |
| `templates/` | Scaffold for new skills |

## Install

Claude Code only, for now: `harnesses/claude-code/install.sh`. Third-party skills
(e.g. mattpocock's) are added by hand with `npx skills add <source> -a universal
--copy`, which records them in `skills-lock.json` — commit that file. See
[`docs/install.md`](docs/install.md).

## Conventions

[`docs/conventions.md`](docs/conventions.md) is normative. [`AGENTS.md`](AGENTS.md)
is the short version an agent reads before editing.
