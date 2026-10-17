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
Connect, the planned runs and the athlete notes in `RUNNING_COACH_HOME`
(default `~/.local/share/running-coach`), outside any repository. Nothing about
the user is stored in this skill.

Run it as `uv run scripts/coach.py <command>` (uv installs `garminconnect`
from the script's header). Add `--json` to any command when you need the data
rather than the summary.

| Command | Does |
|---|---|
| `login` | Interactive Garmin sign-in (email, password, MFA code). **The user runs this themselves**, in their own terminal — never type their password |
| `sync` | Pull new runs. Run it first in every routine |
| `today [--date D]` | That day's planned runs, the run matched to each, and a verdict |
| `week [--date D]` | Monday to Sunday around D: km done vs planned, day by day |
| `plan add D KIND KM [--pace M:SS] [--note TEXT]` | Add a planned run. KIND: easy, long, tempo, intervals, recovery, race, rest |
| `plan rm ID ...` | Remove planned runs by the IDs `today` and `week` print |
| `plan move ID D` | Move a planned run to the day it was actually done (swaps, see below) |
| `notes` | Path and content of the athlete notes (below) |

Verdicts: on target (within 10% of the distance and 5% of the target pace), too
short, too long, too slow, too fast, missed, to do. Each plan takes the longest
free run on its own day, else the day after, else the day before, so a run
moved by a day still counts for its plan; that run's own day lists it under
`counts_for`. A plan is only missed once the day after it has passed too. Runs
matched to no plan are extras. Weekly km done counts runs by the day they were
run.

### Swapped sessions — the CLI matches, you judge

The CLI only pairs a plan with a run on its own day or one day either side. It
can't tell that two sessions were swapped, so look for it in both routines.
Signs:

- a "too long" or "too short" verdict next to a "missed" plan or an extra run,
  within a few days;
- two plans whose distances would fit the runs better the other way round.

When the runs clearly fit the plans swapped, record what happened: `plan move`
each plan to the day its run was done, say so in one line ("you swapped Monday's
easy and Tuesday's tempo; I've recorded it that way"), and show `today` or
`week` again. If it's ambiguous, ask first. Moves only record the past; changes
to coming days go through the weekly routine.

### First use, and when the login stops working

When `sync` says there is no saved Garmin login, or that it no longer works,
it prints the exact `login` command for this install. Pass that command on to
the user as it is, ask them to run it in their own terminal, and wait until
they say it worked; then run `sync` again. Never run `login` yourself: it asks
for a password, and it refuses to run outside a terminal anyway.

If a sign-in fails or Garmin rate-limits (HTTP 429), say so and stop. Don't
retry, and don't suggest retrying soon: repeated attempts extend the block.

## Athlete notes — the memory between sessions

`notes` prints the path of a Markdown file that carries what the database
can't: races and goals, benchmarks, heart-rate zones and training paces, the
season outline, preferences (days, other sports, injuries), and why the plan
looks the way it does. **Read it at the start of every routine**; plan from it,
not from scratch.

Write to it (with your file tools, at that path) whenever the user tells you
something lasting, a benchmark changes, or the weekly routine changes the plan.
Keep it current, not a transcript:

- Fixed sections: `Races and goals`, `Benchmarks`, `Zones and paces`,
  `Season outline`, `Preferences`, `Log`.
- Replace stale facts in place; put a date on every benchmark.
- `Log`: one dated line per decision and its reason, newest first. Trim
  entries older than a season to a single summary line.
- Mark what is unconfirmed (a race date not yet published) as such.

If the file doesn't exist, create it with those sections the first time there
is something to put in it.

## Daily routine — "did I run, and how did it go?"

1. `notes`, `sync`, then `today --json`.
2. Say in two or three lines: what was planned, what was done, the verdict.
   Check for swapped sessions (above) before reporting a verdict.
3. One observation that matters this week, if any — "that's the second short
   long run", not a lecture. No change to the plan here; that is weekly.

## Weekly routine — "adjust the coming week"

1. `notes`, `sync`, then `week --json` for the week just ending and `week
   --date <next Monday> --json` for the one coming. Place the coming week in
   the season outline: weeks to the next race, and which phase that is.
2. Check the week just ending for swapped sessions (above), then summarise it:
   km done against planned, verdicts that repeat.
3. Propose changes to the coming week, with a reason for each. Conservative
   defaults, which the user's own rules override:
   - Don't make up missed distance. Missed sessions are dropped, not stacked.
   - Week-on-week growth at most 10%. After a week well under plan, repeat that
     week's volume instead of growing.
   - Repeated "too fast" on easy runs → keep the target pace and say so;
     repeated "too slow" on quality sessions → ease the target pace by 5–10 s/km.
   - Keep one long run and at most two hard sessions (tempo, intervals, race),
     never on consecutive days.
   - Check benchmarks against the goal: a new best or a checkpoint missed
     changes the paces and, if needed, the goal. Say which, and why.
4. **Show the changes and wait for a yes**, then apply them with `plan rm` and
   `plan add`, and show `week` again.
5. Update the athlete notes: benchmarks, the outline if it moved, a `Log` line.
6. Offer to sync the calendar (below) for the weeks that changed.

This is a generic template, not medical or coaching advice; say so if the user
mentions pain or injury, and suggest a professional.

## Calendar

"Put my plan on my calendar", "sync my calendar": mirror the planned runs into
the user's calendar with whatever calendar tool the session has (Google
Calendar, for instance). No calendar tool → say so; don't improvise one.

The plan in the database is the source of truth; the calendar is a copy. Each
planned run is one event, recognised by a marker line in its description, so
only events this skill made are ever changed:

| Field | Value |
|---|---|
| Title | `Run: <kind> <km> km` |
| Time | all-day on the plan's date (start that day, end the next), unless the user gives a time |
| Availability | free, so it doesn't block their day |
| Description | target pace and note, if any, then a last line `running-coach plan <id>` |

1. Pick the range: today to the end of next week, unless the user says otherwise.
   Get the plans with `week --date D --json` for each week in it (skip `rest`).
2. List the calendar's events in that range, searching for the text
   `running-coach plan`, and read the plan id off each marker line.
3. Work out the difference:
   - a plan with no event → **create**;
   - an event whose date, title or description no longer matches its plan → **update**;
   - an event whose plan id no longer exists in that range → **delete**.
4. **Show the list (create / update / delete, one line each) and wait for a
   yes.** Then apply it and report what changed. Send no notifications.

Never touch an event without the marker, even if it looks like a run. Past
days are left alone: they're history.

## Done when

The daily routine has reported today's verdict, or the weekly routine has
applied the changes the user agreed to and shown the new week.
