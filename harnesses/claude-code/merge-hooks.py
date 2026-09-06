#!/usr/bin/env python3
"""Merge this repo's hooks into Claude Code's settings.json.

settings.json is shared — it holds hooks this repo does not own. So this
merges additively, marks its own entries, is idempotent across runs, and
backs the file up before touching it.
"""
import json
import os
import shutil
import sys
from pathlib import Path

# Neutral event name -> Claude Code event name. Events the harness does not
# have are simply absent from this map; never emulate a missing event.
EVENTS = {
    "session-start": "SessionStart",
    "session-end": "SessionEnd",
    "user-prompt": "UserPromptSubmit",
    "pre-tool": "PreToolUse",
    "post-tool": "PostToolUse",
    "notify": "Notification",
    "stop": "Stop",
}

MARKER = "agentic"  # identifies entries this script owns


def main(repo: str, settings_path: str) -> int:
    hooks_dir = Path(repo) / "hooks"
    found = {
        p.stem: p
        for p in sorted(hooks_dir.glob("*.sh"))
        if p.stem in EVENTS and os.access(p, os.X_OK)
    }

    unknown = [p.stem for p in hooks_dir.glob("*.sh") if p.stem not in EVENTS]
    for u in unknown:
        print(f"  skipped  {u}.sh — not a neutral event name", file=sys.stderr)

    if not found:
        print("  none     no executable hooks matching a known event")
        return 0

    settings = Path(settings_path)
    data = {}
    if settings.exists():
        shutil.copy2(settings, settings.with_suffix(".json.bak"))
        try:
            data = json.loads(settings.read_text())
        except json.JSONDecodeError as e:
            print(f"  ERROR    {settings} is not valid JSON: {e}", file=sys.stderr)
            return 1

    hooks = data.setdefault("hooks", {})
    added = kept = 0

    for neutral, path in found.items():
        event = EVENTS[neutral]
        entries = hooks.setdefault(event, [])

        # Drop only our own previous entries; everything else is somebody's.
        before = len(entries)
        entries[:] = [e for e in entries if e.get("_source") != MARKER]
        kept += before - (before - len([e for e in entries if e.get("_source") != MARKER]))

        entries.append({
            "_source": MARKER,
            "hooks": [{"type": "command", "command": str(path), "timeout": 5}],
        })
        added += 1
        print(f"  wired    {neutral} -> {event}")

    settings.parent.mkdir(parents=True, exist_ok=True)
    settings.write_text(json.dumps(data, indent=2) + "\n")
    foreign = sum(
        1 for evs in hooks.values() for e in evs if e.get("_source") != MARKER
    )
    print(f"  {added} wired, {foreign} pre-existing hook entries left untouched")
    print(f"  backup: {settings.with_suffix('.json.bak')}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: merge-hooks.py <repo> <settings.json>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
