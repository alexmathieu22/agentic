---
name: product-discovery
description: >
  Use when a request arrives as a solution ("add a dropdown", "we need a
  dashboard") and the underlying problem hasn't been stated, or when scoping
  something new and the requirements are still vague. Gets to the real problem
  before anyone estimates.
x-domain: engineering.product
x-requires: []
---

# Product discovery

## When this applies

Someone asked for a *thing*. Before building it, find out what would count as
the problem being solved — because the thing requested is frequently the first
solution someone thought of, not the best one.

## Questions that do work

Ask few, and make them count.

- **"What happens today?"** Walk the current process end to end, including the
  workarounds. The workaround usually *is* the requirement.
- **"Who has this problem, and how often?"** Frequency and blast radius decide
  priority far better than how loudly it was requested.
- **"What do you do when it goes wrong?"** Reveals the error paths that never
  make it into the happy-path request.
- **"What would you stop doing if this existed?"** If the answer is nothing, the
  value is questionable.
- **"How would we know it worked?"** If nobody can name a measurable change,
  either the outcome is unclear or it's a cost of doing business — which is
  fine, but say so.
- **"What have you already tried?"** Stops you from proposing the thing that
  failed last year.

## Separate the layers

Keep these distinct in your notes; conflating them is what produces features
nobody uses.

| Layer | Example |
|---|---|
| **Problem** | Support can't tell which orders are stuck |
| **Outcome** | Stuck orders are noticed within 15 minutes |
| **Solution** | A dashboard / an alert / a daily digest |

Requests arrive at the solution layer. Estimate and prioritise at the outcome
layer. Multiple solutions usually reach the same outcome at very different costs.

## Before committing

- **Name the smallest thing that tests the belief.** Often a manual process, a
  query someone runs, or a message in a channel — not software.
- **State what you're assuming.** "We assume support checks this daily." Wrong
  assumptions are cheaper to find now.
- **Decide what's out.** Explicitly. Unstated exclusions become surprises at demo.

## Red flags

- The requester can't name a person who'll use it.
- The value is described only as "visibility" or "alignment".
- The scope grows every time you ask a question — that's several problems
  wearing one coat.
- Everyone agrees immediately. Usually means the hard part hasn't surfaced yet.

## Done when

You can state the problem, the affected users, the observable outcome, and what
is explicitly out of scope — in a paragraph, without using the word "just".
