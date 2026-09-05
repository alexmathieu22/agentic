---
name: incident-response
description: >
  Use when something is broken in production right now — an outage, degradation,
  data problem, or a page. Prioritises restoring service over understanding it,
  and preserves what's needed for the postmortem afterwards.
x-domain: engineering.delivery
x-requires: []
---

# Incident response

## When this applies

Users are affected and the clock is running. Not for a bug found in review —
that's `debug-systematically`, which optimises for understanding rather than speed.

## Order of operations

**Mitigate first. Diagnose second.** These compete, and during an incident
mitigation wins. A perfectly understood outage is still an outage.

1. **Establish impact.** Who is affected, how badly, and is it getting worse?
   This decides everything else, including whether to wake anyone.
2. **Stop the bleeding.** Roll back, disable the flag, fail over, shed load,
   scale up. Prefer the reversible action you understand over the clever one.
3. **Communicate early and on a cadence.** Say what you know, what you don't,
   and when you'll next update. Silence is read as absence.
4. **Only then, find the cause** — unless finding it is the fastest way to stop it.

## While working

- **Write down what you do, as you do it**, with timestamps. Memory reconstructs
  incidents wrongly, always favourably.
- **One person changes things.** Concurrent fixes make it impossible to tell
  what helped, and can compound the failure.
- **Announce changes before making them.** "I'm restarting the workers now."
- **Preserve evidence before destroying it** — capture logs, metrics, a heap
  dump, the broken rows — but never at the cost of prolonging the outage.
- **Check the obvious recent thing.** Most incidents follow a change. What
  deployed, what config moved, what certificate expired, what filled up?

## Rolling back

Roll back on suspicion, not proof. A rollback that turns out to be unnecessary
costs a deploy; the diagnosis you did instead costs the outage. If rollback is
not safe or not possible, that is itself a finding for the postmortem.

## Afterwards

- Write it up while it's fresh — timeline, impact, contributing causes, what
  made detection or recovery slow.
- **Blameless, and mean it.** Ask what made the mistake easy to make. Systems
  that depend on nobody erring are already broken.
- Actions must have owners and dates, or they're a wish list. Prefer a small
  number that actually get done.
- The most valuable findings are usually about *detection and recovery time*,
  not the trigger. The next incident will have a different trigger.

## Done when

Service is restored, the timeline is written, and the follow-up actions are
assigned to people rather than to the team.
