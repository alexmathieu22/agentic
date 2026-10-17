---
name: running-coach
description: >
  Use when the user asks about their running against a training plan — "did I
  run today", "how did today's run go", "how's my week", "check my training",
  "plan next week", "adjust my plan" — or wants planned runs put on their
  calendar. Syncs runs from Garmin Connect into a local database and compares
  them with the planned runs it holds.
x-domain: life.running
x-requires: [python3, uv]
---

# Running coach

Two routines over one CLI, `scripts/coach.py`. It keeps runs synced from Garmin
Connect and the planned runs in a local SQLite file; nothing about the user is
stored in this skill.

Run it as `uv run scripts/coach.py <command>` (uv installs `garminconnect`
from the script's header). Add `--json` to any command when you need the data
rather than the summary.

| Command | Does |
|---|---|
| `login` | Interactive Garmin sign-in. **The user runs this themselves** — never type their password |
| `sync` | Pull new runs. Run it first in every routine |
| `today [--date D]` | That day's planned runs, the run matched to each, and a verdict |
| `week [--date D]` | Monday to Sunday around D: km done vs planned, day by day |
| `plan add D KIND KM [--pace M:SS] [--note TEXT]` | Add a planned run. KIND: easy, long, tempo, intervals, recovery, race, rest |
| `plan rm ID ...` | Remove planned runs by the IDs `today` and `week` print |

Verdicts: on target (within 10% of the distance and 5% of the target pace), too
short, too long, too slow, too fast, missed, to do. A run is matched to a plan
on the same day only; a run on another day shows as an extra.

If `sync` fails because the login expired or Garmin rate-limits (HTTP 429), say
so and stop. Don't retry sign-ins: retrying extends the block.

## Daily routine — "did I run, and how did it go?"

1. `sync`, then `today --json`.
2. Say in two or three lines: what was planned, what was done, the verdict. If
   a run is missing, check whether yesterday's or tomorrow's plan holds it
   before calling it missed.
3. One observation that matters this week, if any — "that's the second short
   long run", not a lecture. No change to the plan here; that is weekly.

## Weekly routine — "adjust the coming week"

1. `sync`, then `week --json` for the week just ending and `week --date <next
   Monday> --json` for the one coming.
2. Summarise the week just ending: km done against planned, verdicts that repeat.
3. Propose changes to the coming week, with a reason for each. Conservative
   defaults, which the user's own rules override:
   - Don't make up missed distance. Missed sessions are dropped, not stacked.
   - Week-on-week growth at most 10%. After a week well under plan, repeat that
     week's volume instead of growing.
   - Repeated "too fast" on easy runs → keep the target pace and say so;
     repeated "too slow" on quality sessions → ease the target pace by 5–10 s/km.
   - Keep one long run and at most two hard sessions (tempo, intervals, race),
     never on consecutive days.
4. **Show the changes and wait for a yes**, then apply them with `plan rm` and
   `plan add`, and show `week` again.

This is a generic template, not medical or coaching advice; say so if the user
mentions pain or injury, and suggest a professional.

## Calendar

When the user wants planned runs on their calendar, use whatever calendar tool
the session has. One event per planned run: title `<kind> <km> km`, the target
pace and note in the description, all-day unless the user gives a time. Ask
before creating or changing events, and list existing running events in that
week first so nothing is added twice. No calendar tool → say so; don't
improvise one.

## Done when

The daily routine has reported today's verdict, or the weekly routine has
applied the changes the user agreed to and shown the new week.
