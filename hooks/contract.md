# Hook contract

Hooks are the least standardized part of the agent ecosystem — every harness
invented its own event names, payloads, and blocking semantics. This repo
defines one neutral contract and lets adapters map onto it.

## The contract

- A hook is an **executable file** in `hooks/`.
- It receives **one JSON object on stdin**.
- Exit code `0` means proceed. Non-zero means "object" — what the harness does
  with that is harness-specific (usually blocks the action).
- **stdout** is advisory text that may be shown to the user or fed back to the agent.
- **stderr** is diagnostics only.
- A hook must complete in **under one second** and must not require network access.
  Slow hooks are felt on every single turn.

## Payload

Every payload carries at least:

```json
{
  "event": "session-start",
  "harness": "claude-code",
  "cwd": "/home/you/Repos/home-ops",
  "timestamp": "2026-09-05T18:00:00Z"
}
```

Event-specific fields are additive. A hook must ignore fields it doesn't know
and must not assume any optional field is present.

## Events

Neutral event names. Adapters map harness events onto these and **skip events
their harness doesn't have** — never emulate a missing event.

| Neutral event | Fires |
|---|---|
| `session-start` | New agent session begins |
| `session-end` | Session closes |
| `user-prompt` | User submits a prompt |
| `pre-tool` | Before a tool call |
| `post-tool` | After a tool call |
| `notify` | Harness wants to notify the user |
| `stop` | Agent finished its turn |

## Writing one

Use `hooks/lib/` helpers. Read stdin once, parse defensively, exit fast:

```sh
#!/bin/sh
. "$(dirname "$0")/lib/common.sh"
payload=$(cat)
event=$(json_get "$payload" event)
[ "$event" = "session-start" ] || exit 0
# ...
exit 0
```
