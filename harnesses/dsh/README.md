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

- Node `^22.19.0` or `>=24.0.0` (asdf provides 22.22.1 — satisfied)
- ~1 GB free disk for the package, workspace and session logs
- No GPU

### Install and run

The version is pinned in `package.json` rather than left to `npx`, which
resolves the newest release each time — including across release candidates.

```bash
cd harnesses/dsh
pnpm install
pnpm web           # Web UI on http://127.0.0.1:3080
pnpm headless      # no browser
```

`dsh` is at `0.1.2-rc.1` — pre-1.0 and moving. Expect the schema to shift, and
re-check this directory against the real thing after upgrading.

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
mkdir -p ~/.dsh
cp harnesses/dsh/settings.yaml ~/.dsh/settings.yaml
```

`~/.dsh/` is `$DSH_HOME`: config, sessions, plugins, and a user-global
`AGENTS.md`. Symlink this repo's `AGENTS.md` there if you want its conventions
loaded globally rather than only inside this repo.

**Never commit `~/.dsh/.credentials.yaml`.** It is outside this repo, but the
root `.gitignore` guards against a stray copy.

---

## Verify

Written from documentation, not from a running install — `dsh` was not yet
installed when this was added. On first run, confirm:

1. `customSkillDirs` is a top-level key and paths are accepted absolute.
2. Settings → Skills lists this repo's skills, attributed to the custom roots.
3. A skill fires without being named — describe a review situation in your own
   words and see whether `code-review` triggers.
4. The OpenRouter provider appears in the model picker and a request succeeds.
5. Tool use works through OpenRouter — the known weak spot when routing agentic
   traffic. If it fails, switch to the direct `deepseek` provider and report it
   here rather than working around it silently.

Correct this directory against what you actually find.
