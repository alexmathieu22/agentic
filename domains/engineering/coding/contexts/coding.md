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
