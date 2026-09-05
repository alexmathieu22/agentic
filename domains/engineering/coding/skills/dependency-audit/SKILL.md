---
name: dependency-audit
description: >
  Use before adding a dependency, when reviewing a version bump, or when asked
  whether a package is safe to adopt. Weighs the real cost of a dependency
  against writing the code yourself.
x-domain: engineering.coding
x-requires: []
---

# Dependency audit

## When this applies

Any `add`, `install`, or bump in a lockfile — yours or a bot's.

## Before adopting

Ask, in order:

1. **What does it actually replace?** If it's under ~100 lines of code you fully
   understand, writing it is usually cheaper over five years than the upgrade
   treadmill, supply-chain exposure, and transitive weight.
2. **How big is the tail?** Count *transitive* dependencies, not direct. A
   package with 40 transitive deps is 40 maintainers who can now reach your build.
3. **Is it maintained?** Recent commits, releases, and — more telling — whether
   issues get triaged. A repo with 300 open issues and no responses is
   abandoned regardless of its star count.
4. **What is the exit cost?** How much of your code touches its types? Wrapping
   a dependency behind your own thin interface is cheap upfront and turns a
   migration from a rewrite into a swap.
5. **License.** Compatible with how you ship, today and if this ever becomes
   commercial.

## Reviewing a bump

- Read the changelog between the two versions, not just the version numbers.
  Semver is a promise, not a guarantee.
- Major bumps: find the migration notes and the removals. Assume something you
  use was removed.
- A bump that changes a lockfile by thousands of lines needs a reason. Check
  whether a transitive dep changed owners or added install scripts.
- Security bumps get shipped promptly and separately from feature work.

## Red flags

- Recently transferred ownership, or a new maintainer with no history.
- Install-time scripts (`postinstall`) that aren't obviously necessary.
- A published bundle that doesn't match the repo's source.
- Typosquat-shaped names close to a popular package.

## Done when

You can state, in one sentence, what the dependency does for you that you
weren't going to write, and what it would cost to remove.
