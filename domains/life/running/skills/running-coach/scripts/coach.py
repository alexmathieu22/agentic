#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["garminconnect>=0.3"]
# ///
"""Runs from Garmin Connect next to a training plan, in a local SQLite file.

  coach.py login                      sign in to Garmin once (saves tokens, not the password)
  coach.py sync [--days N]            pull new runs from Garmin Connect
  coach.py today [--date D]           the day's planned runs next to the runs done
  coach.py week [--date D]            Monday to Sunday around D: planned vs done
  coach.py plan add D KIND KM [--pace M:SS] [--note TEXT]
  coach.py plan rm ID [ID ...]
  coach.py notes                      where the athlete notes live, and what they say

Every command takes --json. The database and the notes live in RUNNING_COACH_HOME
(default ~/.local/share/running-coach), outside any repository. Garmin tokens live in
GARMIN_TOKENS (default ~/.garminconnect, the garminconnect library's own default, so
another tool's login is reused).
"""
import argparse
import getpass
import json
import os
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

HOME = Path(os.environ.get("RUNNING_COACH_HOME", "~/.local/share/running-coach")).expanduser()
DB, NOTES = HOME / "running.db", HOME / "athlete.md"
TOKENS = str(Path(os.environ.get("GARMIN_TOKENS", "~/.garminconnect")).expanduser())
SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, date TEXT, start_time TEXT, name TEXT,
                                 distance_m REAL, duration_s REAL, avg_hr REAL);
CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY, date TEXT, kind TEXT, distance_km REAL,
                                  pace_s REAL, note TEXT);
"""
DIST_TOL, PACE_TOL = 0.10, 0.05


def connect(path=DB) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


LOGIN_CMD = f"uv run {Path(__file__).resolve()} login"
RUN_LOGIN = f"The user signs in once, in their own terminal:\n  {LOGIN_CMD}"


def garmin(email=None, password=None):
    try:
        from garminconnect import Garmin, GarminConnectTooManyRequestsError
    except ImportError:
        sys.exit("garminconnect is not installed. Run this script with `uv run`, or install it in a virtualenv.")
    if email:
        api = Garmin(email, password, prompt_mfa=lambda: input("MFA code: ").strip())
        try:
            api.login(TOKENS)  # signs in and saves the tokens
        except GarminConnectTooManyRequestsError:
            sys.exit("Garmin is rate-limiting sign-ins (HTTP 429). Wait a few hours; retrying early extends the block.")
        except Exception as e:  # wrong password, MFA, network: all end the same way
            sys.exit(f"Garmin sign-in failed: {e}\nCheck the details at https://connect.garmin.com, then wait "
                     "before trying again: repeated attempts get rate-limited.")
        return api
    if not Path(TOKENS).exists():
        sys.exit(f"No saved Garmin login in {TOKENS}.\n{RUN_LOGIN}")
    api = Garmin()
    try:
        api.login(TOKENS)  # loads the saved tokens and refreshes them
    except Exception as e:  # expired or revoked tokens, a changed password, an auth change
        sys.exit(f"The saved Garmin login no longer works ({e}).\n{RUN_LOGIN}")
    return api


def sync(conn, api, days: int, today: date) -> int:
    last = conn.execute("SELECT max(date) FROM runs").fetchone()[0]
    start = date.fromisoformat(last) if last else today - timedelta(days=days)
    before = conn.execute("SELECT count(*) FROM runs").fetchone()[0]
    for a in api.get_activities_by_date(start.isoformat(), today.isoformat()) or []:
        if "running" not in ((a.get("activityType") or {}).get("typeKey") or ""):
            continue
        st = (a.get("startTimeLocal") or "").replace(" ", "T")[:19]
        conn.execute("INSERT OR REPLACE INTO runs VALUES (?,?,?,?,?,?,?)",
                           (f"garmin:{a['activityId']}", st[:10], st, a.get("activityName"),
                            a.get("distance"), a.get("duration"), a.get("averageHR")))
    conn.commit()
    return conn.execute("SELECT count(*) FROM runs").fetchone()[0] - before


def verdict(plan: dict, run: dict | None, today: date) -> str:
    if run is None:
        # A plan can still be met the day after, so it is only missed once that day has passed too.
        return "missed" if date.fromisoformat(plan["date"]) < today - timedelta(days=1) else "to do"
    ratio = (run["distance_m"] or 0) / 1000 / plan["distance_km"] if plan["distance_km"] else 1
    if ratio < 1 - DIST_TOL:
        return "too short"
    if ratio > 1 + DIST_TOL:
        return "too long"
    if plan["pace_s"] and (p := run_pace(run)):
        if p > plan["pace_s"] * (1 + PACE_TOL):
            return "too slow"
        if p < plan["pace_s"] * (1 - PACE_TOL):
            return "too fast"
    return "on target"


def days(conn, lo: date, hi: date, today: date) -> list[dict]:
    """One entry per day from lo to hi: its plans with the run matched to each, the runs done that day for a plan
    on another day, and the runs left over. A plan takes the longest free run on its own day, else the day after,
    else the day before, so a run moved by a day still counts for its plan."""
    # Matching over the whole table, not just lo..hi, so every view pairs the same run with the same plan.
    # ponytail: rematches everything per call; fine for years of personal runs, window it if it ever isn't
    plans = [dict(p) for p in conn.execute("SELECT * FROM plans ORDER BY date, distance_km DESC")]
    free = [dict(r) for r in conn.execute("SELECT * FROM runs ORDER BY date, distance_m DESC")]
    for p in plans:
        p["run"] = None
    for shift in (0, 1, -1):
        for p in plans:
            if p["run"] or p["kind"] == "rest":
                continue
            want = (date.fromisoformat(p["date"]) + timedelta(days=shift)).isoformat()
            p["run"] = next((r for r in free if r["date"] == want), None)
            if p["run"]:
                free.remove(p["run"])
    out = []
    d = lo
    while d <= hi:
        iso = d.isoformat()
        mine = [p for p in plans if p["date"] == iso]
        for p in mine:
            p["verdict"] = "rest" if p["kind"] == "rest" else verdict(p, p["run"], today)
        moved = [{"plan_id": p["id"], "plan_date": p["date"], "run": p["run"]}
                 for p in plans if p["run"] and p["run"]["date"] == iso and p["date"] != iso]
        out.append({"date": iso, "plans": mine, "counts_for": moved, "extras": [r for r in free if r["date"] == iso]})
        d += timedelta(days=1)
    return out


def week(conn, day: date, today: date) -> dict:
    monday = day - timedelta(days=day.weekday())
    sunday = monday + timedelta(days=6)
    ds = days(conn, monday, sunday, today)
    planned = sum(p["distance_km"] for d in ds for p in d["plans"] if p["kind"] != "rest")
    # Distance done is counted by the day it was run, whichever plan it was matched to.
    done = conn.execute("SELECT coalesce(sum(distance_m), 0) FROM runs WHERE date BETWEEN ? AND ?",
                        (monday.isoformat(), sunday.isoformat())).fetchone()[0] / 1000
    return {"monday": monday.isoformat(), "planned_km": round(planned, 1), "done_km": round(done, 1), "days": ds}


def run_pace(run: dict) -> float | None:
    """Seconds per km, or None for a run with no distance or duration (a manual entry, say)."""
    return run["duration_s"] / (run["distance_m"] / 1000) if run["distance_m"] and run["duration_s"] else None


def pace(s) -> str:
    return f"{int(s // 60)}:{int(s % 60):02d}/km" if s else ""


def run_text(r: dict) -> str:
    return f"{(r['distance_m'] or 0) / 1000:.1f} km at {pace(run_pace(r)) or '?'}" + (
        f", HR {r['avg_hr']:.0f}" if r["avg_hr"] else "")


def day_text(d: dict) -> str:
    lines = [d["date"]]
    for p in d["plans"]:
        target = f"{p['kind']} {p['distance_km']:g} km {pace(p['pace_s'])}".strip()
        done = f" -> {run_text(p['run'])}" + (f" on {p['run']['date']}" if p["run"]["date"] != p["date"] else "") if p["run"] else ""
        lines.append(f"  [{p['id']}] {target}{done}: {p['verdict']}" + (f"  ({p['note']})" if p["note"] else ""))
    lines += [f"  {run_text(m['run'])}: counts for [{m['plan_id']}] on {m['plan_date']}" for m in d["counts_for"]]
    lines += [f"  extra: {run_text(r)}" for r in d["extras"]]
    return "\n".join(lines if len(lines) > 1 else lines + ["  nothing planned or done"])


def parse_pace(s: str) -> float:
    m, sec = s.split(":")
    return int(m) * 60 + int(sec)


def main(argv=None):
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--json", action="store_true")
    common.add_argument("--db", type=Path, default=DB)
    p = argparse.ArgumentParser(prog="coach.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("login", parents=[common])
    sub.add_parser("notes", parents=[common])
    sub.add_parser("sync", parents=[common]).add_argument("--days", type=int, default=90, help="days to fetch on first sync")
    for name in ("today", "week"):
        sub.add_parser(name, parents=[common]).add_argument("--date", type=date.fromisoformat, default=date.today())
    plan = sub.add_parser("plan").add_subparsers(dest="action", required=True)
    add = plan.add_parser("add", parents=[common])
    add.add_argument("date", type=date.fromisoformat)
    add.add_argument("kind", choices=["easy", "long", "tempo", "intervals", "recovery", "race", "rest"])
    add.add_argument("km", type=float)
    add.add_argument("--pace", type=parse_pace, help="target pace as M:SS per km")
    add.add_argument("--note")
    plan.add_parser("rm", parents=[common]).add_argument("ids", type=int, nargs="+")
    a = p.parse_args(argv)

    if a.cmd == "login":
        if not sys.stdin.isatty():
            sys.exit(f"login asks for a password, so it only runs in a terminal.\n{RUN_LOGIN}")
        garmin(input("Garmin email: ").strip(), getpass.getpass("Garmin password: "))
        return print(f"Logged in. Tokens saved to {TOKENS}")
    if a.cmd == "notes":
        text = NOTES.read_text() if NOTES.exists() else ""
        return print(json.dumps({"path": str(NOTES), "text": text}, indent=2) if a.json
                     else f"{NOTES}\n\n{text or '(no notes yet)'}")
    conn, today = connect(a.db), date.today()
    if a.cmd == "sync":
        result = {"added": sync(conn, garmin(), a.days, today)}
        text = f"{result['added']} new runs synced"
    elif a.cmd == "today":
        result = days(conn, a.date, a.date, today)[0]
        text = day_text(result)
    elif a.cmd == "week":
        result = week(conn, a.date, today)
        text = "\n".join([f"Week of {result['monday']}: {result['done_km']} of {result['planned_km']} km"]
                         + [day_text(d) for d in result["days"]])
    elif a.action == "add":
        cur = conn.execute("INSERT INTO plans(date, kind, distance_km, pace_s, note) VALUES (?,?,?,?,?)",
                           (a.date.isoformat(), a.kind, a.km, a.pace, a.note))
        result, text = {"id": cur.lastrowid}, f"Added plan {cur.lastrowid}"
    else:
        n = conn.execute(f"DELETE FROM plans WHERE id IN ({','.join('?' * len(a.ids))})", a.ids).rowcount
        result, text = {"removed": n}, f"Removed {n} plans"
    conn.commit()
    print(json.dumps(result, indent=2) if a.json else text)


if __name__ == "__main__":
    main()
