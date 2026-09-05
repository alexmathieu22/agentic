---
name: acceptance-criteria
description: >
  Use when a story, ticket, or requirement needs conditions someone else can
  verify — before development starts, or when a "done" claim is being disputed.
  Produces criteria that translate directly into tests.
x-domain: engineering.product
x-requires: []
---

# Acceptance criteria

## When this applies

Before work starts. Criteria written afterwards describe what was built, which
defeats the purpose — their job is to prevent the argument, not to settle it.

## Form

Use Given/When/Then when there is state and a trigger:

```
Given  an order that has been paid but not shipped
When   the customer requests cancellation
Then   the order status becomes Cancelled
And    a refund is initiated for the full amount
```

Use a checklist when the criteria are simply conditions that must hold. Don't
contort a list of constraints into Gherkin for the sake of the format.

## Rules

- **Observable from outside.** Criteria describe what a user or a caller can
  see. "The service caches the result" is not acceptance criteria; "a second
  identical request returns within 50ms" might be.
- **One behaviour each.** Compound criteria report only their first failure.
- **Include the unhappy paths.** Most defects live where nobody wrote a
  criterion: invalid input, expired state, duplicate submission, permission
  denied, downstream unavailable.
- **Name the boundaries.** "Large file" is untestable; "over 25 MB" is. Every
  threshold, timeout, limit and rounding rule gets a number.
- **Say what should *not* happen** where it matters — no email sent, no charge
  applied, nothing written.

## The verification test

Hand the criteria to someone who wasn't in the conversation. If they have to
ask you a question to check them, they aren't finished.

## What doesn't belong

- Implementation instructions ("use a queue") — that's a design decision, not
  acceptance.
- Non-functional wishes with no number ("fast", "secure", "user-friendly").
  Either quantify it or move it to a definition of done.
- Anything nobody will actually check.

## Done when

Each criterion is independently verifiable, the error paths are covered, every
threshold has a number, and the developer and the reviewer would both reach the
same verdict without conferring.
