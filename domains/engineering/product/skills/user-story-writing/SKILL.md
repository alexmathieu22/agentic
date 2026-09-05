---
name: user-story-writing
description: >
  Use when turning a validated problem into work a team can pick up — writing or
  splitting user stories, or fixing a backlog of vague tickets. Applies INVEST
  and vertical slicing.
x-domain: engineering.product
x-requires: []
---

# Writing user stories

## When this applies

The problem is understood (see `product-discovery`) and needs to become
deliverable increments. Not every ticket is a story — a bug is a bug, a chore is
a chore. Don't force the template.

## Form

```
As a <specific role>
I want <capability>
So that <outcome that matters to them>
```

The `so that` is the only part that can't be faked. If you can't complete it
without restating the `I want`, the value hasn't been established.

"As a user" is almost always too vague to be useful — it hides the fact that
three different roles want three different things.

## INVEST

| | Test |
|---|---|
| **Independent** | Can it ship without a specific other story shipping first? |
| **Negotiable** | Does it state the need rather than dictating the implementation? |
| **Valuable** | Could you explain the benefit to the person paying? |
| **Estimable** | Does the team know enough to size it? If not, the gap is a spike. |
| **Small** | Comfortably inside one iteration, ideally days. |
| **Testable** | Could someone else verify it without asking you what you meant? |

## Splitting

Split **vertically** — every slice delivers observable value end to end. Splitting
by layer ("the API story", "the UI story") produces work that can't be
demonstrated, released, or validated until all parts land.

Useful seams, roughly in order of how often they work:

- **Workflow steps** — ship the first step of the journey, then the next.
- **Rules** — the simple case now, the exceptions later.
- **Data variations** — one input type or one region first.
- **Interface** — a crude but complete path, then the polished one.
- **Operations** — create now; edit and delete later.
- **Effort** — hardcode the hard part, replace it once the shape is proven.

If a story can't be split vertically, that's usually a signal about coupling in
the system, not about the story.

## Smells

- Contains the words "and", "also", or a bulleted list of features — that's several stories.
- Names a technology in the title.
- Value described as "so that we can have X" where X is the feature itself.
- Nobody can say who would notice if it shipped.

## Done when

Every story has a role, a capability, a real outcome, acceptance criteria (see
`acceptance-criteria`), and could be released on its own.
