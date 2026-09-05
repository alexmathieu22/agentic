---
name: pr
description: Prepare the current branch for review and open a pull request, after approval.
x-args: "[base-branch]"
x-domain: engineering.coding
---

Prepare this branch for review against `$ARGS` (default: the repository's
default branch), applying the `pull-request` skill.

Determine the host and its CLI from the remote before doing anything else —
do not assume GitHub.

Run the preparation yourself, without asking:

1. Rebase onto the base branch and report any conflicts rather than guessing.
2. Read the full diff. Report anything that looks unintended — debug output,
   commented-out code, a file that does not belong in this change.
3. Run the tests. Report the actual output, including failures.
4. Check the history: is each commit one logical change, is each message in
   Conventional Commits form?

Then **stop and show me**, before creating anything:

- the commits that would be pushed, one line each
- the diffstat
- the proposed PR title and full description
- anything you would change about the history first

Wait for my approval. If I want commits reworded, split or reordered, do that
with an interactive rebase and show me again.

Only after I approve: push the branch and open the pull request. Open it as a
draft if the tests did not pass or the work is unfinished.

Never force-push a branch that is already under review without telling me first.
