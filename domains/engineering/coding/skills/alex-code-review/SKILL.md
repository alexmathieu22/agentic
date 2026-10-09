---
name: alex-code-review
description: >
  Use when reviewing a diff, a branch, a pull request, or code you just wrote,
  and when posting review comments to a pull or merge request. Wraps the
  code-review skill with my own rules: correctness before style, a failure
  scenario for every finding, and every posted comment prefixed with 🤖. Prefer
  this over code-review when both could fire.
x-domain: engineering.coding
x-requires: [git]
---

# Alex's code review

## When this applies

Any time the question is "is this change correct and would I ship it" — your own
work included. Not for greenfield design questions; that's `domain-modeling`.

## Start with `code-review`

Load the `code-review` skill and follow its process: pin the fixed point, find
the spec and the standards, run the Standards and Spec axes in parallel,
aggregate. It owns the mechanics; this skill changes what you report and how you
post. If it isn't installed, say so and do the review yourself in the order
below.

Its sub-agents can't see this skill, so append the order of attention and the
failure-scenario requirement (see Reporting) to both sub-agent prompts.

`code-review` points at `/setup-matt-pocock-skills` for the issue tracker. Don't
run that: the host is inferable from `git remote get-url origin`, with
`~/.config/agents/git.yaml` for what the remote can't tell you (see
`pull-request`).

## Order of attention

Applies inside the Standards and Spec reports and to anything you add. Stop
escalating once you find something serious — a naming nit above a data-loss bug
buries the bug.

1. **Correctness** — does it do what it claims, for the inputs it will see?
2. **Failure modes** — error, empty input, concurrency, retry, partial write.
3. **Security & data** — injection, authz checks, secrets in logs, PII crossing a boundary.
4. **Interface** — is this API easy to misuse?
5. **Reuse** — does something in the codebase already do this?
6. **Readability**, then **style** — only what a linter can't catch.

## Method

- Read the diff once for intent, then again for defects.
- For each hunk, ask what input makes it wrong. If you can't construct one,
  report a question, not a defect.
- Check the edges the diff doesn't touch: callers of a changed signature, tests
  that should have changed, docs that now lie.
- Verify claims. "No behaviour change" needs the line that proves it. Run the
  tests rather than assuming they pass.

## Reporting

Every finding gets the location, one sentence on the defect, and a concrete
failure scenario — inputs or state that produce the wrong output. Without a
scenario it's a preference; label it as one.

Separate **must fix** from **worth considering**. Say what is good, briefly,
only when it is.

## Posting comments

- **Every comment starts with 🤖** — inline comments, the summary, and replies.
  Reviewers should always be able to tell which comments came from an agent.
- **Draft first.** Show the comments and wait for a yes before posting anything
  to the pull or merge request.
- **Comments only.** Never approve, request changes, or resolve a thread unless
  I ask.
- **One finding per comment**, anchored to the line it is about, with its
  severity (must fix / consider) in the first sentence after the 🤖.
- **Don't comment on what CI or a linter already enforces.**

## Done when

Every must-fix has a reproducible failure scenario, any comment to be posted is
shown to me with its 🤖, and you would be comfortable being paged if it ships
as-is.
