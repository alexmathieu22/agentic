## Engineering conventions

- Read the surrounding code before adding to it. Reuse what exists rather than
  introducing a parallel way to do the same thing.
- Small, reviewable changes. One concern per commit.
- Errors are handled where they can be acted on, not swallowed at the boundary
  and not decorated at every level in between.
- Names describe intent, not implementation. `retryUntilQuorum`, not `loop2`.
- Comments explain *why*. The code already says what.
- No dead code, no commented-out blocks, no speculative abstraction for a second
  case that doesn't exist yet.
- Tests assert behaviour, not internals. A test that breaks on every refactor is
  testing the wrong thing.

## Git

- **Never commit to the default branch.** Work on a branch, or a worktree when
  the task is long-running or runs alongside another.
- **Conventional Commits**, always: `type(scope): subject`.
- **Atomic commits** — one logical change each, not one file each. A rename and
  the behaviour change that follows it are two commits even when they touch the
  same file.
- **Never commit without showing me first**, unless I have said to go ahead.
  Show what would go in each commit so we can split, squash or reword before it
  becomes history.
- **Never push without being asked.** Once pushed, rewriting is my problem
  instead of a rebase.
- **Never open a pull request without showing me the commits and the
  description first.** Opening one notifies people and starts CI; the first
  version is what reviewers judge.

`git-workflow` and `pull-request` have the detail: commit types, splitting a mixed working tree,
branch vs worktree, and fixing history before it leaves the machine.
