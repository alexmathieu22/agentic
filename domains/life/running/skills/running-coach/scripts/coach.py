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
        except Exception as e:  # noqa: BLE001 - wrong password, MFA, network: all end the same way
            sys.exit(f"Garmin sign-in failed: {e}\nCheck the details at https://connect.garmin.com, then wait "
                     "before trying again: repeated attempts get rate-limited.")
        return api
    if not Path(TOKENS).exists():
        sys.exit(f"No saved Garmin login in {TOKENS}.\n{RUN_LOGIN}")
    api = Garmin()
    try:
        api.login(TOKENS)  # loads the saved tokens and refreshes them
    except Exception as e:  # noqa: BLE001 - expired or revoked tokens, a changed password, an auth change
        sys.exit(f"The saved Garmin login no longer works ({e}).\n{RUN_LOGIN}")
    return api


def sync(conn, api, days: int, today: date) -> int:
    last = conn.execute("SELECT max(date) FROM runs").fetchone()[0]
    start = date.fromisoformat(last) if last else today - timedelta(days=days)
    added = 0
    for a in api.get_activities_by_date(start.isoformat(), today.isoformat()) or []:
        if "running" not in ((a.get("activityType") or {}).get("typeKey") or ""):
            continue
        st = (a.get("startTimeLocal") or "").replace(" ", "T")[:19]
        cur = conn.execute("INSERT OR REPLACE INTO runs VALUES (?,?,?,?,?,?,?)",
                           (f"garmin:{a['activityId']}", st[:10], st, a.get("activityName"),
                            a.get("distance"), a.get("duration"), a.get("averageHR")))
        added += cur.rowcount
    conn.commit()
    return added


def verdict(plan: dict, run: dict | None, today: date) -> str:
    if run is None:
        return "missed" if plan["date"] < today.isoformat() else "to do"
    ratio = run["distance_m"] / 1000 / plan["distance_km"] if plan["distance_km"] else 1
    if ratio < 1 - DIST_TOL:
        return "too short"
    if ratio > 1 + DIST_TOL:
        return "too long"
    if plan["pace_s"]:
        pace = run["duration_s"] / (run["distance_m"] / 1000)
        if pace > plan["pace_s"] * (1 + PACE_TOL):
            return "too slow"
        if pace < plan["pace_s"] * (1 - PACE_TOL):
            return "too fast"
    return "on target"


def days(conn, lo: date, hi: date, today: date) -> list[dict]:
    """One entry per day: its plans, each paired with the longest unclaimed run that day, and the runs left over."""
    out = []
    d = lo
    while d <= hi:
        iso = d.isoformat()
        runs = [dict(r) for r in conn.execute("SELECT * FROM runs WHERE date = ? ORDER BY distance_m DESC", (iso,))]
        plans = []
        # ponytail: same-day matching only; a run done a day early or late counts as an extra
        for p in conn.execute("SELECT * FROM plans WHERE date = ? ORDER BY distance_km DESC", (iso,)):
            p = dict(p)
            p["run"] = runs.pop(0) if runs and p["kind"] != "rest" else None
            p["verdict"] = "rest" if p["kind"] == "rest" else verdict(p, p["run"], today)
            plans.append(p)
        out.append({"date": iso, "plans": plans, "extras": runs})
        d += timedelta(days=1)
    return out


def week(conn, day: date, today: date) -> dict:
    monday = day - timedelta(days=day.weekday())
    ds = days(conn, monday, monday + timedelta(days=6), today)
    planned = sum(p["distance_km"] for d in ds for p in d["plans"] if p["kind"] != "rest")
    done = sum(r["distance_m"] for d in ds for r in [p["run"] for p in d["plans"] if p["run"]] + d["extras"]) / 1000
    return {"monday": monday.isoformat(), "planned_km": round(planned, 1), "done_km": round(done, 1), "days": ds}


def pace(s) -> str:
    return f"{int(s // 60)}:{int(s % 60):02d}/km" if s else ""


def run_text(r: dict) -> str:
    return f"{r['distance_m'] / 1000:.1f} km at {pace(r['duration_s'] / (r['distance_m'] / 1000))}" + (
        f", HR {r['avg_hr']:.0f}" if r["avg_hr"] else "")


def day_text(d: dict) -> str:
    lines = [d["date"]]
    for p in d["plans"]:
        target = f"{p['kind']} {p['distance_km']:g} km {pace(p['pace_s'])}".strip()
        done = f" -> {run_text(p['run'])}" if p["run"] else ""
        lines.append(f"  [{p['id']}] {target}{done}: {p['verdict']}" + (f"  ({p['note']})" if p["note"] else ""))
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
    add.add_argument("kind", help="easy, long, tempo, intervals, recovery, race or rest")
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
        text = f"{result['added']} runs synced"
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
