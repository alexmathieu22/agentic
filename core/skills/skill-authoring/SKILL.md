---
name: skill-authoring
description: >
  Use when writing a new skill for this repo or fixing one that never fires.
  Covers the spec's hard requirements, how to write a description that triggers,
  and where a skill belongs versus a context or a project repo.
x-domain: core
x-requires: []
---

# Authoring a skill

## When this applies

Adding to `skills/`, or diagnosing a skill that exists but is never used.

## Does this belong in a skill at all?

| It's… | Put it in |
|---|---|
| A repeatable procedure with steps | a skill |
| Always true, every turn, no procedure | a context (`contexts/`) |
| Only ever relevant in one repository | that repo's own `.agents/skills/` |
| A persona that needs its own tool set | `agents/` |

Skills cost nothing until they fire. Contexts cost tokens on every turn. When in
doubt, make it a skill.

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

## Testing it

The real test is whether it fires unprompted. Start a fresh session, describe a
situation in your own words without naming the skill, and see if it triggers. If
it doesn't, the description is wrong — not the body.

## Done when

The frontmatter is valid, the folder name matches, the description names
concrete triggers, and it fires in a session where you never mentioned it.
