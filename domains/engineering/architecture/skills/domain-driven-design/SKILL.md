---
name: domain-driven-design
description: >
  Use when modelling a non-trivial business domain, when deciding where a module
  boundary belongs, or when the code's vocabulary has drifted from what the
  people who own the problem actually say. Covers ubiquitous language, bounded
  contexts, aggregates and the tactical patterns.
x-domain: engineering.architecture
x-requires: []
---

# Domain-driven design

## When this applies

The problem has real domain complexity — rules that experts argue about, terms
that mean different things to different teams, invariants that must hold. DDD is
overhead on a CRUD app; it pays for itself when the *rules* are the hard part.

## Start with language, not structure

The single highest-value practice, and the one most often skipped.

- Use the domain expert's words in the code, exactly. If they say "policy" and
  the class is `InsuranceRecord`, every conversation now needs translation, and
  translation is where bugs enter.
- When one word means two things, you have found a **context boundary**, not a
  naming problem. "Customer" in billing and "Customer" in support are different
  concepts that happen to share a label. Do not unify them.
- When two words mean one thing, force the choice and change the code.
- The glossary is code, not a wiki page. It rots the moment it lives elsewhere.

## Bounded contexts

A bounded context is the scope within which one model is coherent and one
vocabulary is unambiguous.

- Draw boundaries where the **language changes**, not where the technology
  changes. `services/` and `utils/` are not boundaries.
- Each context owns its data and exposes a contract. Two contexts sharing a
  database table share a model whether they meant to or not.
- Map the relationships explicitly: which context is upstream, who conforms to
  whom, where translation happens (an anti-corruption layer), and what happens
  when the upstream changes.

Signals the boundary is wrong: every feature touches two contexts; a change to
one forces a coordinated deploy of the other; the same aggregate is loaded and
saved from both sides.

## Tactical patterns

Reach for these only inside a context that has earned them.

| Pattern | Use for | Test |
|---|---|---|
| **Value object** | A concept with no identity — `Money`, `DateRange`, `EmailAddress` | Two with the same values are interchangeable |
| **Entity** | A concept with continuity — this order, over time | Identity survives every attribute changing |
| **Aggregate** | A consistency boundary around entities | Everything inside is valid together, transactionally |
| **Repository** | Loading and saving *aggregates* | One repository per aggregate root, never per table |
| **Domain event** | Something meaningful that happened | Named in the past tense, and other contexts care |
| **Domain service** | A rule belonging to no single entity | Stateless; would be awkward as a method on either party |

### Aggregate sizing

The most common and most expensive mistake is the aggregate that is too large.

- An aggregate is a **transactional consistency boundary**: the invariants inside
  it must hold after every single operation.
- Prefer small. One aggregate per transaction. Reference other aggregates by id,
  never by object.
- If two things can be eventually consistent, they belong to different
  aggregates. "The order total must match its lines" is an invariant; "the
  customer's lifetime value must be current" is not.
- Contention is the smell: if two users editing unrelated things conflict, the
  aggregate is too big.

## Keep the domain clean

The model holds rules. It does not hold HTTP, SQL, framework base classes, or
serialization annotations. Push those to the edges — the domain should be
testable with no I/O and no container.

## Anti-patterns

- **Anemic model** — entities that are just field bags, with all the rules in a
  `Manager` or `Service`. This is procedural code with extra ceremony.
- **Shared kernel by accident** — a "common" module that slowly absorbs every
  context's types until nothing can change independently.
- **DDD as folder layout** — creating `domain/`, `application/`,
  `infrastructure/` and changing nothing about the model. The structure is the
  last artifact, not the first.

## Done when

A domain expert could read the core type names and method signatures aloud and
recognise their own vocabulary, and each aggregate's invariants can be stated in
one sentence.
