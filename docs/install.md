# Installing

Claude Code is the only wired harness. The content stays in open formats so
others can be added later, but nothing else is set up.

## Install

```bash
harnesses/claude-code/install.sh
```

Every skill — yours and third-party — is installed with `npx skills add -g -a
claude-code`, which **copies**. Rerun the script after editing a skill, or enable
the git hook that does it after merges and rebases. Details in
[`harnesses/claude-code/README.md`](../harnesses/claude-code/README.md).

Claude Code scans a **flat** skills directory, so layers are flattened:

```
domains/engineering/coding/skills/alex-code-review/     ─┐
domains/engineering/product/skills/user-story-writing/  ─┼─▶ ~/.claude/skills/<name>/
core/skills/agentic-authoring/                          ─┘
```

That is why skill names must be unique repo-wide (see `docs/conventions.md`).

## Third-party skills

Add them yourself, inside the repo, then install:

```bash
npx skills add mattpocock/skills --skill tdd -a universal --copy   # writes skills-lock.json
harnesses/claude-code/install.sh                                   # installs globally
```

Commit `skills-lock.json`; it is the record of where each skill came from.
`.agents/skills/` is gitignored. On a new machine:

```bash
npx skills experimental_install     # restores .agents/skills/ from the lock
harnesses/claude-code/install.sh
```

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
