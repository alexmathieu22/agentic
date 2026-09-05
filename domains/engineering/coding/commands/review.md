---
name: review
description: Review the current diff for correctness, then reuse and clarity.
x-args: "[base-ref]"
x-domain: engineering.coding
---

Review the changes against `$ARGS` (default: the merge base with the main branch).

Apply the `code-review` skill. Report findings most severe first, each with a
concrete failure scenario. Separate must-fix from worth-considering.

Do not apply fixes unless I ask.
