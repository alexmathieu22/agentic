---
name: debug-systematically
description: >
  Use when something is broken and the cause is not obvious — a failing test, a
  bug report, flaky behaviour, or a change that worked locally and doesn't in
  CI. Replaces guess-and-check with a method that converges.
x-domain: engineering.coding
x-requires: [git]
---

# Debug systematically

## When this applies

You have a symptom and no confirmed cause. If you already know the cause, you're
fixing, not debugging — skip this.

## The loop

1. **Reproduce it.** Reliably, and as small as possible. A bug you cannot
   reproduce on demand cannot be confirmed fixed. If reproduction is flaky, that
   flakiness *is* the first thing to understand.
2. **State the expectation.** Write down what should happen and what does. Being
   unable to state this precisely usually means the bug is in your model, not
   the code.
3. **Bisect the space, not the code.** Each observation should roughly halve the
   candidate causes. Ask "is the bad value already wrong when it enters this
   function?" rather than reading forward line by line.
4. **One change at a time.** Two simultaneous changes make a fix
   indistinguishable from a coincidence.
5. **Confirm the mechanism.** You must be able to explain *why* the fix works.
   "It stopped happening" is not a diagnosis, and often means you moved the
   timing rather than the bug.

## Tactics that pay

- `git bisect` when it used to work. It converges in log₂(n) commits and needs
  no theory.
- Diff the environments when it works here and not there — versions, env vars,
  clock, locale, file ordering, available memory.
- Read the actual error, all of it, including the parts that look like noise.
  The stack frame you skipped is a common hiding place.
- Add the assertion you wish had existed, and leave it in.
- When stuck, state the problem out loud from the beginning. Most stalls are a
  false assumption adopted in the first five minutes.

## Anti-patterns

- Changing things to see what happens, without a hypothesis.
- Fixing the symptom at the point it surfaced rather than where it originated.
- Concluding "race condition" or "caching" without evidence — these are the two
  most common unfounded diagnoses.

## Done when

You can explain the causal chain from root cause to symptom, the reproduction
now passes, and a regression test exists that fails on the old code.
