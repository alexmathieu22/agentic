---
name: refactor-safely
description: >
  Use when restructuring code that must keep behaving identically — extracting,
  renaming, splitting modules, changing an internal interface. Keeps the change
  reviewable and prevents behaviour drifting in under cover of a large diff.
x-domain: engineering.coding
x-requires: [git]
---

# Refactor safely

## When this applies

The goal is a better structure with the same behaviour. If behaviour is meant to
change too, that's two changes — do them separately and in that order.

## Rules

1. **Characterize first.** If the code isn't covered, add tests that pin current
   behaviour *before* touching it — including the behaviour you think is wrong.
   Fix that separately, afterwards, so the fix is visible in its own diff.
2. **Never mix a refactor with a behaviour change in one commit.** A reviewer
   cannot verify a hundred-line move and a logic change at the same time, so
   they verify neither.
3. **Move in reversible steps.** Each commit compiles and passes tests. If step
   four is wrong, you revert one commit, not the afternoon.
4. **Let the tools do mechanical work.** Rename/extract refactorings from the
   IDE or codemod are safer than hand edits, and produce diffs that are obviously
   mechanical.
5. **Stop when the structure is good enough.** Refactoring has no natural end;
   the stopping condition is "the change I actually came here to make is now easy."

## Sequence

```
1. tests pin current behaviour        (commit)
2. mechanical restructuring           (commit, one kind of move per commit)
3. delete what is now unreachable     (commit)
4. the behaviour change you wanted    (separate PR if it is at all large)
```

## Watch for

- A "pure rename" that also changes a default, a visibility, or an order of
  operations. Grep the diff for anything that isn't the rename.
- Extracted functions that silently capture different state than the inline code did.
- Tests updated in the same commit as the code they test — that is where drift hides.
- Comments and docs that still describe the old shape.

## Done when

The test suite passes unchanged from before the refactor — same tests, same
assertions — and the diff contains no logic the reviewer must reason about.
