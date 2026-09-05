---
name: code-review
description: >
  Use when reviewing a diff, a pull request, or code you just wrote. Finds
  correctness bugs before style issues, and states plainly what would break and
  under which inputs.
x-domain: engineering.coding
x-requires: [git]
---

# Code review

## When this applies

Any time the question is "is this change correct and would I ship it" — your own
work included. Not for greenfield design questions; that's `adr-writing`.

## Order of attention

Review in this order and stop escalating once you find something serious. A
naming nit reported above a data-loss bug buries the bug.

1. **Correctness** — does it do what it claims, for the inputs it will actually see?
2. **Failure modes** — what happens on error, empty input, concurrency, retry, partial write?
3. **Security & data** — injection, authz checks, secrets in logs, PII crossing a boundary.
4. **Interface** — is this API easy to misuse? Can a caller hold it wrong?
5. **Reuse** — does something in the codebase already do this?
6. **Readability** — naming, structure, comment density.
7. **Style** — last, and only what a linter can't catch.

## Method

- Read the diff once for intent, then again for defects. The first read is
  reconstructing what the author meant; judging while doing that produces
  reviews of the wrong change.
- For each hunk, ask what input makes it wrong. If you can't construct one,
  don't report a correctness finding — report a question instead.
- Check the edges the diff *doesn't* touch: callers of a changed signature,
  tests that should have changed and didn't, docs that now lie.
- Verify claims. If the description says "no behaviour change", find the line
  that proves it.

## Reporting

Every finding gets: the location, one sentence on the defect, and a concrete
failure scenario — inputs or state that produce the wrong output. A finding
without a failure scenario is a preference; label it as one.

Separate **must fix** from **worth considering**. Reviews that flatten the two
train authors to skim.

Say what is good, briefly, when it is genuinely good. Not as padding.

## Done when

Every must-fix has a reproducible failure scenario, and you would be comfortable
being the one paged if it ships as-is.
