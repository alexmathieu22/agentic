---
name: test-first
description: >
  Use when adding behaviour, fixing a bug, or working in code where you are
  unsure what correct looks like. Writing the failing test first, and watching it
  fail for the right reason, is what makes the test trustworthy.
x-domain: engineering.coding
x-requires: []
---

# Test first

## When this applies

New behaviour, or a bug fix. Not worth the ceremony for a typo or a config
change with no logic.

## The cycle

1. **Red.** Write the smallest test that expresses the desired behaviour. Run it.
   **Watch it fail, and read the failure message.** A test that passes before
   the implementation exists is testing nothing, and this step is the only thing
   that catches that.
2. **Green.** Write the least code that makes it pass. Resist generalizing.
3. **Refactor.** Now clean up, with the test holding behaviour still.

The step people skip is watching it fail *for the right reason*. A test failing
on an import error is not yet a test.

## What to assert

- Behaviour visible at the boundary — inputs and outputs, not internal calls.
- The edges: empty, one, many, maximum, malformed, duplicate, out of order.
- The error path, and its message when the message is part of the contract.
- For a bug fix: the exact reported case, then the general case around it.

## What not to assert

- That a specific private method was invoked. That's a change-detector test; it
  fails on every refactor and tells you nothing about correctness.
- Wall-clock timing, iteration order that isn't guaranteed, or anything else the
  contract doesn't promise.
- Everything at once. One reason to fail per test — a test with six assertions
  reports only the first.

## Naming

Name the case, not the function: `rejects_expired_token`, not `test_auth_2`.
The name is what you read in a failure report at 3am.

## Done when

Every new branch is exercised, each test fails if you revert the change that
made it pass, and the suite runs fast enough that you actually run it.
