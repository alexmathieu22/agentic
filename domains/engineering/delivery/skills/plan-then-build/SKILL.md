---
name: plan-then-build
description: >
  Use before starting any implementation that touches more than a couple of
  files, has several valid approaches, or where being wrong means redoing the
  work. Produces an agreed plan first, so the expensive part happens once.
x-domain: engineering.delivery
x-requires: []
---

# Plan then build

## When this applies

Multi-file changes, new features, anything architectural, anything where you
caught yourself about to guess at what the user wanted. Skip it for typos,
one-line fixes, and tasks specified in enough detail to have no decisions left.

## The plan

1. **Understand before designing.** Read the code that already exists in this
   area. Most plans that get rejected proposed rebuilding something that was
   already there under a different name.
2. **State the problem in one paragraph** — including why it's being done now.
   If you can't, you don't understand the request yet; ask.
3. **Name the approach, and the one you rejected.** A plan with a single option
   hasn't been thought about; a plan with five is deferring the decision back to
   the reader. One recommendation, one credible alternative, and why.
4. **List the files.** Concretely. Where a pattern repeats across many files,
   describe the pattern once and name three examples.
5. **Say how it will be verified.** Which command, which test, what output
   proves it works. Decide this before building, when it can still change the
   design.
6. **Call out what you're unsure about.** Uncertainty surfaced in a plan is
   cheap; discovered halfway through implementation it is not.

## Sizing

A plan should be shorter than the change it describes. If the plan is longer
than the diff will be, either the change is trivial or the plan has become the
work.

## During implementation

- Follow the plan. When reality contradicts it, say so and adjust explicitly
  rather than silently diverging — the plan was the agreement.
- If the plan turns out to be wrong in a way that changes the outcome, stop and
  re-plan. Continuing to build something you now know is wrong wastes both
  people's time.

## Done when

Someone else could execute the plan and produce roughly what you intended, and
you would both agree afterwards on whether it worked.
