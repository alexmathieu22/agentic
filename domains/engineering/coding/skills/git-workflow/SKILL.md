---
name: git-workflow
description: >
  Use when committing, branching, or about to push — writing a commit message,
  deciding between a branch and a worktree, splitting a working tree that has
  become several changes, or cleaning up history before it leaves the machine.
  Covers Conventional Commits, atomic commits, and rebasing to fix mistakes.
x-domain: engineering.coding
x-requires: [git]
---

# Git workflow

## When this applies

Any point where work becomes history. Not for reading history — `git log` is
just a command.

## Where the work happens

**Never commit to the default branch.** Choose:

| | Use when |
|---|---|
| **Branch** | Ordinary task. One thing at a time, done in this checkout. |
| **Worktree** | The task is long-running, or has to coexist with other work — a review while a feature is half-done, a hotfix mid-refactor, two agents on one repo. |

```bash
git worktree add ../repo-<task> -b <type>/<subject>
```

A worktree is a second checkout of the same repository, so it avoids stashing
and avoids rebuilding state every time you switch. Remove it when done:
`git worktree remove ../repo-<task>`.

Branch names mirror the commit type: `feat/oauth-callback`, `fix/retry-loop`,
`docs/adr-folder-split`.

## Conventional Commits

```
type(scope): subject

body — why, not what. wrap at 72.

BREAKING CHANGE: <what breaks and what to do about it>
```

| Type | For |
|---|---|
| `feat` | A new capability |
| `fix` | A bug fix |
| `refactor` | Behaviour unchanged, structure changed |
| `perf` | Faster, behaviour unchanged |
| `docs` | Documentation only |
| `test` | Tests only |
| `build` | Build system, dependencies, tooling |
| `ci` | Pipeline config |
| `chore` | Housekeeping with no source effect |
| `revert` | Reverts a previous commit |

Rules that matter:

- **Subject is imperative and lowercase**: `fix: handle empty payload`, not
  `fixed` or `Fixes`. Read it as "if applied, this commit will…".
- **No trailing period.** Under ~72 characters.
- **Scope is optional** and names the area, not the file: `feat(auth):`.
- **The body explains why.** The diff already shows what. If the reason is
  obvious, omit the body rather than restating the diff.
- `!` after the type, or a `BREAKING CHANGE:` footer, for anything that breaks
  a consumer: `feat(api)!: require idempotency key`.

## Atomic commits

One **logical change** per commit — not one file, and not one session's work.
The test: could this commit be reverted on its own without breaking the build
or dragging along something unrelated?

A rename and the behaviour change that follows it are two commits even when
they touch the same lines. That is precisely the case where combining them
makes review impossible (see `refactor-safely`).

### Splitting a working tree that became several changes

This is the common case — you set out to do one thing and did three.

```bash
git add -p                 # stage hunk by hunk; 's' splits a hunk further
git commit                 # first logical change
# repeat for each remaining change
git stash -k               # optional: stash the rest and run tests on what you staged
```

For changes tangled within a single hunk, edit the file down to just the first
change, commit, then restore the rest. Slower, but it produces history someone
can bisect.

## Before it leaves the machine

**Show the commits before pushing.** History is cheap to fix while it is local
and expensive afterwards.

```bash
git log --oneline @{u}..     # what would be pushed
git log -p @{u}..            # with the diffs
```

Then fix whatever is wrong:

```bash
git commit --amend           # reword or fix the most recent commit
git rebase -i @{u}           # reword, squash, split, reorder anything unpushed
```

In the interactive rebase: `reword` to fix a message, `squash`/`fixup` to
combine, `edit` then `git reset HEAD^` to split a commit into several.

**Never rewrite history that has been pushed to a shared branch.** Once it is
published, the fix is a new commit, not a rebase.

## Done when

Every commit is one logical change with a Conventional Commits message, the
branch or worktree matches the work, and nothing is pushed that hasn't been
shown first.
