# DeepSeek Harness (`dsh`)

Wiring for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) —
DeepSeek's own agent runtime, MIT, "everything is a plugin".

This directory may read the canonical content in this repo. **The canonical
content must never reference this directory.** Delete `harnesses/dsh/` and the
repo is still whole; only the wiring is gone.

---

## The finding that matters

`dsh` scans skills from ranked roots, and `customSkillDirs` takes **a list**:

| Rank | Root |
|---|---|
| 100 | `<project>/.dsh/skills` |
| 200 | `<project>/.agents/skills` |
| **300** | **`customSkillDirs` — configurable, multiple** |
| 400 | `~/.dsh/skills` |
| 500 | `~/.agents/skills` |

Scanning is exactly **one directory level** — `<root>/<name>/SKILL.md`, never
recursive. So each layer of this repo is listed as its own root, and the layered
structure survives with no flattening, no symlinking, no copies. Editing a skill
here takes effect on the next session.

It also means the flattening constraint in `docs/install.md` — the reason skill
names must be globally unique — does not bind `dsh`. Keep the names unique
anyway; a harness with a single root would still collide.

Ranks 200 and 500 are the `.agents` convention, so project-level extension
(`home-ops/.agents/skills/`) works with no configuration at all, and takes
precedence over everything here.

**Correction, checked against `dsh`'s actual source (an earlier version of
this file got this wrong):** `customSkillDirs` is not a top-level
`$DSH_HOME/settings.yaml` key. `dsh`'s real config surface for this is a
Cordis plugin row — a `@deepseek-ai/dsh-skill-filesystem` entry
inside an *agent preset's* `agent.cordis.yml` (confirmed in
`deepseek-ai/deepseek-harness@d347e70`,
`packages/preset/agent-presets/presets/standard/agent.cordis.yml`).
`settings.yaml` is a real, separate, flatter config surface — it's genuinely
correct for `llm-pi-ai` below and for `agent-presets: default:` — but
`customSkillDirs` isn't one of the fields it accepts. See [Presets](#presets).

---

## Running it: locally, not in Docker

**Decision: run `dsh` on the host.**

Community Docker images exist (`runzhliu/deepseek-harness-docker` and others,
with Compose and a Helm chart) and Docker is the better answer for a *service*.
`dsh` is not a service — it is a coding agent whose entire job is to run your
toolchain against your repositories. In a container it cannot see your
asdf-managed `talosctl`, `flux2`, `kubectl`, your ssh agent, your `gh` auth, or
your git config, and getting them in means bind-mounting so much of the host
that the isolation stops being real.

The genuine argument for the container is **sandboxing an agent that runs
unattended**. If you ever want that — a long autonomous run, or something you
would rather could not touch `$HOME` — the container is the right tool and the
images above are the place to start. For interactive work it costs more than it
returns. Note also that the images are community-maintained, not official.

### Prerequisites

All pinned in the repo's `.tool-versions`, so asdf provides them:

| | |
|---|---|
| Node | `^22.19.0 \|\| >=24.0.0` — pinned at 22.22.1 |
| pnpm | pinned at 10.32.1 |

Also ~1 GB free disk for the package, workspace and session logs. No GPU.

### Install and run

The version is pinned in `package.json` rather than left to `npx`, which
resolves the newest release each time — including across release candidates.

```bash
cd harnesses/dsh
pnpm install --frozen-lockfile
pnpm web           # Web UI on http://127.0.0.1:3080
pnpm headless      # no browser
```

`pnpm-lock.yaml` is committed, so `--frozen-lockfile` gives the same tree every
time. Without it the pin covers only dsh itself: one direct dependency pulls
**561 transitive packages**, and unpinned they float on every install. That tail
is worth knowing about — it is 561 maintainers who can reach this machine.

`dsh` is at `0.1.2-rc.1` — pre-1.0 and moving. Expect the schema to shift, and
re-check this directory against the real thing after upgrading.

---

## Presets

`dsh` composes each session from an **agent preset**: a directory holding
`agent.cordis.yml` (the plugin rows that session runs with — tools, prompt
sections, skills) and `preset.yml` (display name/description). Presets live
under two roots: shipped ones bundled with `dsh`, and yours under
`$DSH_HOME/.agent-presets/<id>/`. A session runs the deployment's `default`
preset unless it names another, and `settings.yaml` can override that default
per user with `agent-presets: default: <id>` (confirmed real, unlike
`customSkillDirs` above — this one *does* register a settings-document
namespace).

[`harnesses/dsh/presets/agentic/`](presets/agentic/) is this repo's preset: a
copy of `dsh`'s own shipped `standard` preset — the full coding agent (shell,
fs, skills, goals, plan mode, compaction, subagents, workflows) — with two
changes, each commented in place in [`agent.cordis.yml`](presets/agentic/agent.cordis.yml):

1. `skill-filesystem`'s `customSkillDirs` lists this repo's skill layers —
   the actual fix for the `customSkillDirs` mistake above.
2. `persona`'s text gains the [ponytail](https://github.com/DietrichGebert/ponytail)
   YAGNI ladder (MIT). ponytail has no `dsh` integration of its own — its
   README lists Claude Code, Codex, Copilot CLI, Pi, OpenCode, Gemini CLI and
   Qoder, and its hooks fire on `SessionStart`/`UserPromptSubmit`, Claude/Codex
   event names `dsh` doesn't emit — so its ruleset is reproduced verbatim under
   its MIT license instead of installed as a plugin. `dsh-persona` registers a
   fixed system-prompt section for every request on this preset, which is the
   closest thing `dsh` has to what ponytail's own hook does elsewhere: always
   on, not dependent on skill-relevance-matching guessing it's applicable.

Install by symlinking the whole directory, the same live-edit approach as the
Claude Code harness:

```bash
mkdir -p ~/.dsh/.agent-presets
ln -s "$(pwd)/harnesses/dsh/presets/agentic" ~/.dsh/.agent-presets/agentic
```

`settings.yaml` already sets it as the default (`agent-presets: default:
agentic`), so a plain new session should use it with no further action once
`settings.yaml` is installed too (see [Setup](#setup)).

**This preset will drift from upstream `standard`.** It's a point-in-time copy
of `deepseek-ai/deepseek-harness@d347e70` (2026-09-06) — a version bump to
`standard` upstream (a new tool row, a changed default) won't reach this copy
automatically. Re-diff `presets/agentic/agent.cordis.yml` against a fresh copy
of the shipped `standard` after upgrading `dsh`, and reapply the two changes
above if it changed. Untested against a live install — confirm the symlink is
actually discovered and mountable before relying on it (see
[Verify](#verify)).

---

## Provider: OpenRouter

`settings.yaml` registers OpenRouter as a custom provider using the
`openai-completions` protocol, which is what OpenRouter serves.

**The key is never written to `settings.yaml`.** `apiKeyEnv` names an
environment variable, and `providers/openrouter.env` already exports
`OPENROUTER_API_KEY`:

```bash
source ~/.config/agents/openrouter.env
cd harnesses/dsh && pnpm web
```

That keeps one answer to "where do keys live" across every harness. `dsh` will
otherwise write secrets to `$DSH_HOME/.credentials.yaml` when a provider is
added through the UI — workable, but it splits the answer in two.

A direct `deepseek` provider is also configured, for first-party rather than a
router. Switch by sourcing `deepseek.env` instead.

---

## Setup

```bash
mkdir -p ~/.dsh/.agent-presets
cp harnesses/dsh/settings.yaml ~/.dsh/settings.yaml
ln -s "$(pwd)/harnesses/dsh/presets/agentic" ~/.dsh/.agent-presets/agentic
```

`~/.dsh/` is `$DSH_HOME`: config, sessions, plugins, and a user-global
`AGENTS.md`. Symlink this repo's `AGENTS.md` there if you want its conventions
loaded globally rather than only inside this repo — that's a separate channel
from the `agentic` preset above (a dynamically-reread instructions file versus
a persona section fixed at session mount), and the two are complementary, not
redundant.

**Never commit `~/.dsh/.credentials.yaml`.** It is outside this repo, but the
root `.gitignore` guards against a stray copy.

---

## Verify

Written from documentation and `dsh`'s own source, not from a running install
— `dsh` was not yet installed when this was added. On first run, confirm:

1. Settings lists a preset named `agentic`, sourced from
   `~/.dsh/.agent-presets/agentic`, and a new session uses it without naming it
   explicitly (the `agent-presets: default: agentic` override in
   `settings.yaml`).
2. Settings → Skills lists this repo's skills on that preset, attributed to the
   `customSkillDirs` roots in `presets/agentic/agent.cordis.yml`.
3. A skill fires without being named — describe a review situation in your own
   words and see whether `code-review` triggers.
4. The model states the ponytail ladder as governing behavior on an ordinary
   coding request, unprompted — the persona row, not relevance-matching, so it
   should hold even when the request doesn't look like an over-engineering risk.
5. The OpenRouter provider appears in the model picker and a request succeeds.
6. Tool use works through OpenRouter — the known weak spot when routing agentic
   traffic. If it fails, switch to the direct `deepseek` provider and report it
   here rather than working around it silently.

Correct this directory against what you actually find.
