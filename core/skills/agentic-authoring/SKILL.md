---
name: agentic-authoring
description: >
  Use when adding to or fixing this agent setup — writing a skill, agent,
  command or context, choosing which layer it belongs in, or diagnosing a skill
  that exists but never fires. Covers the Agent Skills spec's hard
  requirements, descriptions that actually trigger, and the rule that an agent
  must state when not to use it.
x-domain: core
x-requires: []
---

# Authoring for this repo

## When this applies

Adding any content here, or diagnosing a skill that exists but is never used.
Not for writing a skill in some other project — the layer and `x-domain` rules
below are specific to this repo.

## Does this belong in a skill at all?

| It's… | Put it in |
|---|---|
| A lookup, a one-off, or something an agent would do the same way anyway | **nothing** — don't write it |
| A repeatable procedure with steps that change the outcome | a skill |
| Always true, every turn, no procedure | a context (`contexts/`) |
| Only ever relevant in one repository | that repo's own `.agents/skills/` |
| A persona worth a separate context window | `agents/` |

Skills cost nothing until they fire; contexts cost tokens on every turn. But a
skill that fires and changes nothing is worse than no skill — it spends tokens
and teaches the agent that skills are noise. The test is whether the agent would
produce something *different* with it loaded. If not, don't write it.

### Where it sits in the ladder

`core/contexts/base.md` sets the rule: use the cheapest rung that works — do it
directly, load a skill, or delegate to a subagent, in that order. Write a skill
only for the middle rung. Procedures that exist to be *followed by a whole
persona over many turns* belong in `agents/`; facts and one-off lookups belong
nowhere.

## Hard requirements

- Folder name **must equal** the `name:` field. Harnesses skip mismatches
  silently — no error, the skill simply never exists.
- `name`: lowercase letters, digits, single hyphens. Max 64 chars.
- `name` and `description` are the only required fields.
- Names must be unique across this whole repo — everything lands in one directory.

## The description is the whole game

At startup a harness loads **only** frontmatter — roughly 100 tokens per skill —
and decides relevance from that alone. The body is invisible until it fires.

Write the **trigger**, not the topic:

- ✗ "Best practices for reviewing code."
- ✓ "Use when reviewing a diff, a pull request, or code you just wrote."

Name the situations, the artifacts, and the words a user would actually say.
If two skills could both fire, make each description say what the *other* is for.

## Body

- Under ~200 lines. Push detail into `references/`, loaded only when the body
  says to read it.
- Open with "When this applies", including when it does **not**.
- Be specific enough to change behaviour. A skill that says "write good tests"
  earns nothing; one that says "watch the test fail, and read the failure
  message" does.
- Close with "Done when" — an observable stopping condition.
- Imperative voice. You're writing instructions, not an essay.

## Agents

Agents are the most expensive rung, so their bar is higher.

- `x-tools` are capability **intents** — `read`, `write`, `bash`, `web` — never
  a harness's tool names. Adapters map them; unmappable ones get dropped.
- `x-model` is a **tier** (`fast`, `primary`, `deep`), never a model id, so the
  same agent works on DeepSeek, Anthropic or a local model.
- `x-skills` must name skills that exist.
- **The description must say when *not* to delegate.** It is what a harness
  reads when deciding, so a boundary that appears only in the body arrives
  after the decision is made. Open the body with a `**Not for:**` line too.

Write an agent only when delegation earns its cost: context isolation, a
genuinely different posture, or real parallelism. A persona is not a reason.

## Commands

Thin. A command is a prompt macro that names the skills to apply and states
what not to do — `$ARGS` interpolates the invocation. If a command is growing
procedure of its own, that procedure belongs in a skill it calls.

## Contexts

Only what is **always true** for the layer. Contexts are paid for on every
turn, so a paragraph here costs more over a week than a whole skill that fires
twice. Anything conditional or step-by-step is a skill.

## Choosing a layer

Top-level domains are **areas of life**; the level below is a **kind of work**.
`core/` is for what applies to every session regardless of area — put things
there reluctantly, since it is always loaded.

If it would only ever be useful in one repository, it does not belong here at
all. Put it in that repo's own `.agents/skills/`, where it takes precedence
anyway.

## Testing it

The real test is whether it fires unprompted. Start a fresh session, describe a
situation in your own words without naming the skill, and see if it triggers. If
it doesn't, the description is wrong — not the body.

## Done when

The frontmatter is valid, the folder name matches, the description names
concrete triggers, and it fires in a session where you never mentioned it.
