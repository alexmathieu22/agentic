---
name: alex-code-review
description: >
  Use when reviewing a diff, a branch, a pull request, or code you just wrote,
  when posting review comments to a pull or merge request, and when fixing
  those comments and replying to them with the commit. Wraps the
  code-review skill with my own rules: correctness before style, a failure
  scenario for every finding, and every posted comment prefixed with 🤖. Prefer
  this over code-review when both could fire.
metadata:
  domain: engineering.coding
compatibility: Requires git
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

## Frontend changes

When the diff touches frontend code — components, styles, pages, anything a
person sees or clicks — the pull request must include a **screenshot** of the
changed UI, and a **video** of it being used when the change is interactive (a
flow, an interaction, an animation). Attached to or linked from the description.
Look for them before reading the diff in detail.

- **No screenshot** is a **must fix**, whatever the code looks like: say that
  there is no picture of the change, and what it should show — each state the
  change adds or alters (empty, error, hover).
- **An interactive change with no video** is a **must fix** too: say what it
  should show — the flow from the ticket end to end. A screenshot does not stand
  in for it. A purely static change needs only the screenshot.
- **A screenshot or video that doesn't show the changed feature**, or shows it
  broken, is a finding too.
- They are evidence, not verification: still read the diff and run the checks.
- A change with nothing to see — types, config, a refactor with no visible
  difference — needs neither. Say so in the review rather than staying silent.

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

## Fixing what you posted

Once the comments are up and I ask for the fixes, close each finding in its own
thread.

1. **One commit per finding**, Conventional Commits form, so each reply can cite
   its own SHA. Two findings fixed by one line still get one commit; say so in
   both replies.
2. **Run the tests** after each fix, before moving to the next.
3. **Push the fixes as new commits** on the pull request's branch — never
   amend or force-push while review is open; reviewers lose their place.
4. **Reply in the thread of each finding**, not as a new top-level comment:
   🤖, what changed in a sentence, and the short SHA linked to the commit. For
   a finding you decided not to fix, give the reason instead of a SHA.
5. **Resolve nothing, approve nothing.** The reviewer closes their own threads
   unless I ask otherwise.

The draft-first rule still holds: show the commits and the replies before you
push or post, unless I already said to go ahead.

## Done when

Every must-fix has a reproducible failure scenario, any comment to be posted is
shown to me with its 🤖, for a frontend change the screenshot (and video, when
interactive) was there or its absence is reported, and you would be comfortable
being paged if it ships as-is. When fixing, every posted finding has a reply in
its thread with a linked SHA or a reason.
