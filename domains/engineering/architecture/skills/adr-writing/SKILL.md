---
name: adr-writing
description: >
  Use when making a decision that is expensive to reverse — a datastore, a
  protocol, a boundary, a vendor, a deviation from convention. Produces a short
  Architecture Decision Record capturing the context and the rejected options,
  before implementing.
x-domain: engineering.architecture
x-requires: []
---

# Writing an ADR

## When this applies

The decision is costly to undo, or someone will ask "why is it like this?" in
six months. Reversible decisions don't need one — write the code.

Write it **before** implementing. An ADR written afterwards documents a
rationalisation, and the losing options — the genuinely valuable part — are
already forgotten.

## Format

One file per decision, immutable once accepted, named by date and subject:
`2026-09-05-postgres-over-dynamo.md`.

```markdown
# <Short decision, stated as the outcome>

- **Status:** proposed | accepted | superseded by <link>
- **Date:** 2026-09-05

## Context

The forces at play: constraints, requirements, what we already run, what we
know and what we're guessing. No solutions here. A reader should be able to
reach a different conclusion from this section if their constraints differ.

## Decision

What we are doing, in the active voice. "We will …"

## Consequences

What becomes easier, what becomes harder, what we are now committed to, and
what we will have to revisit. Include the bad parts — an ADR with only
benefits is marketing.

## Options considered

### <Option A> — chosen
### <Option B> — rejected because …
### <Option C> — rejected because …
```

## What makes one good

- **The rejected options carry the value.** Anyone can see what you built; only
  the ADR records what you deliberately didn't, and why. Without them the
  decision gets relitigated annually.
- **Context is written for someone without your memory.** Name the actual
  constraints — team size, budget, the thing that broke last quarter.
- **Consequences are honest.** Record the cost you accepted. This is what tells a
  future reader whether the tradeoff still holds.
- **Short.** One page. If it needs more, the decision is several decisions.

## Lifecycle

ADRs are never edited after acceptance. When a decision changes, write a new ADR
and mark the old one `superseded by`. The record of having believed something is
the point.

## Done when

Someone who wasn't in the room can read it and either agree, or disagree for a
reason you already listed.
