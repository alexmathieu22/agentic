#!/usr/bin/env python3
"""Check the rules that otherwise fail silently. Exits 1 and lists every problem.

Skill rules: folder name == `name:`, valid name, non-empty description, names
unique repo-wide, `x-domain` matches the layer path. Content rule: core/ and
domains/ never name a harness (AGENTS.md rule 6).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
HARNESS = re.compile(r"\.claude/|CLAUDE\.md|settings\.json|customSkillDirs|\.cursor/|\bdsh\b")


def frontmatter(path):
    m = re.match(r"---\n(.*?)\n---\n", path.read_text(), re.S)
    if not m:
        return None
    # ponytail: top-level keys only; a folded `description: >` is detected by its indented lines
    fm, key = {}, None
    for line in m.group(1).splitlines():
        top = re.match(r"([A-Za-z0-9_-]+):\s*(.*)", line)
        if top and not line.startswith(" "):
            key = top.group(1)
            fm[key] = top.group(2).strip().strip(">").strip()
        elif key and line.strip():
            fm[key] = (fm[key] + " " + line.strip()).strip()
    return fm


def layer_domain(skill_dir):
    parts = skill_dir.relative_to(ROOT).parts  # core/skills/x or domains/a/b/skills/x
    return "core" if parts[0] == "core" else ".".join(parts[1:-2])


problems, seen = [], {}
for skill_md in sorted(ROOT.glob("core/skills/*/SKILL.md")) + sorted(ROOT.glob("domains/*/*/skills/*/SKILL.md")):
    d, rel = skill_md.parent, skill_md.relative_to(ROOT)
    fm = frontmatter(skill_md)
    if fm is None:
        problems.append(f"{rel}: no frontmatter")
        continue
    name = fm.get("name", "")
    if name != d.name:
        problems.append(f"{rel}: name '{name}' != folder '{d.name}' (harnesses skip it silently)")
    if not NAME.match(name) or len(name) > 64:
        problems.append(f"{rel}: invalid name '{name}'")
    if not fm.get("description"):
        problems.append(f"{rel}: empty description")
    if fm.get("x-domain") != layer_domain(d):
        problems.append(f"{rel}: x-domain '{fm.get('x-domain')}' != '{layer_domain(d)}'")
    if name in seen:
        problems.append(f"{rel}: name '{name}' also used by {seen[name]}")
    seen.setdefault(name, rel)

for f in sorted(p for top in ("core", "domains") for p in (ROOT / top).rglob("*") if p.is_file()):
    for n, line in enumerate(f.read_text().splitlines(), 1):
        if HARNESS.search(line):
            problems.append(f"{f.relative_to(ROOT)}:{n}: names a harness: {line.strip()[:80]}")

print("\n".join(problems) or f"ok: {len(seen)} skills")
sys.exit(1 if problems else 0)
