#!/usr/bin/env bash
#
# Install this repo's content into Claude Code.
#
#   ./install.sh                    install everything
#   ./install.sh --dry-run          show what would happen, touch nothing
#   ./install.sh --uninstall        remove exactly what this script created
#   ./install.sh --force            replace files this script did not create
#   ./install.sh --context <name>   add a domain context to the global memory
#                                   (repeatable, e.g. engineering.product)
#   ./install.sh --no-context       install no contexts at all
#
# Skills go through `npx skills add -g`, which COPIES — rerun this script after
# editing a skill.
# Idempotent. Never removes anything it did not create.
#
# Third-party skills live in .agents/skills/ (restored from skills-lock.json by
# `npx skills experimental_install`) and are installed from there.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${CLAUDE_HOME:-$HOME/.claude}"
STATE="${AGENTIC_STATE:-$HOME/.config/agents}"
MANIFEST="$STATE/claude-code.manifest"
MARKER="<!-- managed by agentic: harnesses/claude-code/install.sh -->"

# core always applies. engineering.coding is the default because Claude Code is
# a coding tool — its git and engineering rules are true in every session here.
# Other domain contexts are opt-in: they cost tokens on every turn.
DEFAULT_CONTEXTS="core engineering.coding"

DRY=0; UNINSTALL=0; FORCE=0; NOCTX=0
CONTEXTS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)    DRY=1 ;;
    --uninstall)  UNINSTALL=1 ;;
    --force)      FORCE=1 ;;
    --no-context) NOCTX=1 ;;
    --context)    shift; [ $# -gt 0 ] || { echo "--context needs a value" >&2; exit 2; }
                  CONTEXTS="$CONTEXTS $1" ;;
    -h|--help)    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
[ -n "$CONTEXTS" ] || CONTEXTS="$DEFAULT_CONTEXTS"
[ "$NOCTX" = 1 ] && CONTEXTS=""

for tool in npx claude python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

SKILLS_CLI="npx --yes skills"
THIRD_PARTY="$REPO/.agents/skills"

created=0; skipped=0; conflicts=0; removed=0
say()   { printf '  %s\n' "$*"; }
head_() { printf '\n%s\n' "$*"; }
short() { printf '%s' "${1/#$HOME/~}"; }

# Is this global-memory file one we generated? True for the current marked
# form, and for the single-line @AGENTS.md file earlier versions wrote — that
# one is otherwise orphaned: install would not replace it and uninstall would
# not remove it.
ours_memory() {
  [ -f "$1" ] || return 1
  [ "$(head -1 "$1" 2>/dev/null)" = "$MARKER" ] && return 0
  [ "$(cat "$1" 2>/dev/null)" = "@$REPO/AGENTS.md" ] && return 0
  return 1
}

# Turn engineering.coding into domains/engineering/coding
layer_path() {
  case "$1" in
    core) printf 'core' ;;
    *)    printf 'domains/%s' "$(printf '%s' "$1" | tr '.' '/')" ;;
  esac
}

# Skill names under a skills/ directory, one per line.
skill_names() {
  for s in "$1"/*/; do
    [ -f "${s}SKILL.md" ] && basename "$s"
  done
}

# "name<TAB>source" for every skill installed globally for Claude Code.
installed_skills() {
  $SKILLS_CLI list -g -a claude-code --json </dev/null 2>/dev/null | python3 -c '
import json, sys
for s in json.load(sys.stdin):
    print(s["name"] + "\t" + (s.get("source") or ""))'
}

# ---------------------------------------------------------------- uninstall

if [ "$UNINSTALL" = 1 ]; then
  head_ "Uninstalling from $(short "$TARGET")"
  if [ ! -f "$MANIFEST" ]; then
    say "nothing to do — no manifest at $(short "$MANIFEST")"
    exit 0
  fi
  verb="removed"; [ "$DRY" = 1 ] && verb="would remove"
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ -L "$p" ]; then
      [ "$DRY" = 1 ] || rm "$p"
      say "$verb  $(short "$p")"; removed=$((removed+1))
    elif ours_memory "$p"; then
      # The generated memory file is a real file, not a link, but it is ours
      # — and only while it still carries the marker we wrote.
      [ "$DRY" = 1 ] || rm "$p"
      say "$verb  $(short "$p")"; removed=$((removed+1))
    elif [ -e "$p" ]; then
      say "kept       $(short "$p")  (edited since install — not ours to delete)"
    fi
  done < "$MANIFEST"
  [ "$DRY" = 1 ] || rm -f "$MANIFEST"
  if [ "$DRY" = 1 ]; then
    head_ "Would remove $removed item(s). Nothing was changed."
  else
    head_ "Removed $removed item(s)."
  fi
  # Skills installed by `npx skills` aren't in the manifest; remove every global
  # skill whose recorded source is this repo.
  mine=()
  while IFS=$'\t' read -r name src; do
    case "$src" in "$REPO"/*) mine+=("$name") ;; esac
  done < <(installed_skills)
  if [ "${#mine[@]}" -gt 0 ]; then
    if [ "$DRY" = 1 ]; then
      say "would remove  ${#mine[@]} skill(s): ${mine[*]}"
    else
      $SKILLS_CLI remove "${mine[@]}" -g -a claude-code -y </dev/null >/dev/null
      say "removed  ${#mine[@]} skill(s): ${mine[*]}"
    fi
  fi
  say "MCP servers and plugins are not touched — remove"
  say "those with:"
  say "  claude mcp remove <name> -s user"
  say "  claude plugin uninstall ponytail"
  exit 0
fi

# ------------------------------------------------------------------- helpers

mkdir -p "$STATE"
: > "$MANIFEST.new"
# Never leave a half-written manifest behind on failure.
trap 'rm -f "$MANIFEST.new"' EXIT

# ---------------------------------------------------------------- install

head_ "Installing $REPO"
say "into $(short "$TARGET")"
[ "$DRY" = 1 ] && say "(dry run — nothing will be written)"

# --- skills ------------------------------------------------------------------
# Claude Code scans one flat skills directory, so the layers are flattened
# here. Names are unique repo-wide, which is what makes that safe.

head_ "Skills"
# Skills are installed by `npx skills add -g`, not linked. It copies, and it
# overwrites a same-named skill without asking — so a name that exists but did
# not come from `npx skills` is a conflict here.

if [ -f "$REPO/skills-lock.json" ]; then
  missing=$(python3 - "$REPO/skills-lock.json" "$THIRD_PARTY" <<'PY'
import json, os, sys
for n in json.load(open(sys.argv[1])).get("skills", {}):
    if not os.path.isfile(os.path.join(sys.argv[2], n, "SKILL.md")):
        print(n)
PY
  )
  if [ -n "$missing" ]; then
    echo "skills-lock.json lists skills missing from .agents/skills/: $(echo $missing)" >&2
    echo "run: npx skills experimental_install" >&2
    exit 1
  fi
fi

sources=()
while IFS= read -r d; do sources+=("$d"); done < <(find "$REPO/core" "$REPO/domains" -type d -name skills | sort)
[ -d "$THIRD_PARTY" ] && sources+=("$THIRD_PARTY")

dupes=$(for d in "${sources[@]}"; do skill_names "$d"; done | sort | uniq -d)
if [ -n "$dupes" ]; then
  echo "skill name(s) in more than one source: $(echo $dupes)" >&2
  echo "rename or drop one — names must be unique repo-wide" >&2
  exit 1
fi

installed="$(installed_skills)"
for d in "${sources[@]}"; do
  names=()
  while IFS= read -r n; do
    dst="$TARGET/skills/$n"
    if [ -L "$dst" ] && [[ "$(readlink "$dst")" == "$REPO"/* ]]; then
      # Left by the symlink-based installer; npx would write through it into the repo.
      [ "$DRY" = 1 ] || rm "$dst"
    elif [ -e "$dst" ] && ! printf '%s\n' "$installed" | cut -f1 | grep -qx "$n" && [ "$FORCE" != 1 ]; then
      say "CONFLICT   $(short "$dst")  exists and was not installed by npx skills — --force to replace"
      conflicts=$((conflicts+1)); continue
    fi
    names+=("$n")
  done < <(skill_names "$d")
  [ "${#names[@]}" -gt 0 ] || continue
  if [ "$DRY" = 1 ]; then
    say "would      install ${#names[@]} skill(s) from ${d#$REPO/}"
  else
    $SKILLS_CLI add "$d" -g -a claude-code --skill "${names[@]}" -y </dev/null >/dev/null
    say "installed  ${#names[@]} skill(s) from ${d#$REPO/}"
    created=$((created+${#names[@]}))
  fi
done

# Reconcile by warning only: removing what is no longer here could delete skills
# installed by hand.
repo_names=$(for d in "${sources[@]}"; do skill_names "$d"; done)
stale=$(printf '%s\n' "$installed" | while IFS=$'\t' read -r n src; do
  if [[ "$src" == "$REPO"/* ]] && ! printf '%s\n' "$repo_names" | grep -qx "$n"; then echo "$n"; fi
done)
[ -z "$stale" ] || say "note       installed from this repo but no longer in it: $(echo $stale) — npx skills remove -g"

# --- global memory -----------------------------------------------------------
# Claude Code reads CLAUDE.md, not AGENTS.md. What belongs in *global* memory is
# the always-on guidance in contexts/ — not AGENTS.md, which is about authoring
# this repo and would then apply in every unrelated project. Working inside this
# repo already picks AGENTS.md up through the repo's own CLAUDE.md.

head_ "Global memory"
MEMORY="$TARGET/CLAUDE.md"
if [ -z "$CONTEXTS" ]; then
  say "skipped    --no-context"
else
  body="$MARKER"$'\n'"# Global agent guidance"$'\n'
  n=0
  for layer in $CONTEXTS; do
    dir="$REPO/$(layer_path "$layer")/contexts"
    if [ ! -d "$dir" ]; then
      say "WARN       no contexts in layer '$layer'"; continue
    fi
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      body="$body"$'\n'"@$f"
      n=$((n+1))
    done
  done
  body="$body"$'\n'

  if [ -e "$MEMORY" ] && ! ours_memory "$MEMORY"; then
    say "MANUAL     $(short "$MEMORY") exists and is yours — add these lines:"
    printf '%s\n' "$body" | grep '^@' | sed 's/^/               /'
  elif [ -e "$MEMORY" ] && [ "$(cat "$MEMORY")" = "$(printf '%s' "$body")" ]; then
    echo "$MEMORY" >> "$MANIFEST.new"; skipped=$((skipped+1))
  else
    [ "$DRY" = 1 ] || { mkdir -p "$TARGET"; printf '%s' "$body" > "$MEMORY"; }
    echo "$MEMORY" >> "$MANIFEST.new"
    say "wrote      $(short "$MEMORY")  ($n context$([ "$n" = 1 ] || echo s): $CONTEXTS)"
    created=$((created+1))
  fi
  say "note       AGENTS.md is deliberately not imported globally — it is about"
  say "           authoring this repo, and is read via the repo's own CLAUDE.md"
fi

# --- MCP ---------------------------------------------------------------------

head_ "MCP servers"
existing="$(claude mcp list 2>/dev/null | sed 's/:.*//' || true)"
# kind is "stdio" (target = command and args) or "http" (target = URL).
while IFS=$'\t' read -r name kind target; do
  [ -n "$name" ] || continue
  if [ "$kind" = http ]; then
    add="claude mcp add -s user --transport http $name $target"
  else
    add="claude mcp add -s user $name -- $target"
  fi
  if printf '%s\n' "$existing" | grep -qx "$name"; then
    say "ok         $name already registered"
  elif [ "$DRY" = 1 ]; then
    say "would      $add"
  else
    # shellcheck disable=SC2086
    if $add >/dev/null 2>&1; then
      say "added      $name"
      [ "$kind" = http ] && say "           authenticate once: run /mcp in a Claude Code session"
    else
      say "FAILED     $name — run by hand: $add"
    fi
  fi
done < <(python3 - "$REPO/mcp/servers.json" <<'PY'
import json, sys
for n, s in json.load(open(sys.argv[1])).get("mcpServers", {}).items():
  if not isinstance(s, dict):
      continue
  if "command" in s:
      print("\t".join([n, "stdio", " ".join([s["command"], *s.get("args", [])])]))
  elif s.get("type") == "http" and "url" in s:
      print("\t".join([n, "http", s["url"]]))
PY
)

# --- plugins -----------------------------------------------------------------
# ponytail (github.com/DietrichGebert/ponytail) enforces a YAGNI ladder before
# writing code. It's a third-party Claude Code plugin, not repo content, so it
# rides along with the engineering.coding context rather than living in
# domains/ — installing it any other way would put harness vocabulary
# (marketplaces, plugin ids) into canonical content.

head_ "Plugins"
wants_ponytail=0
for c in $CONTEXTS; do
  [ "$c" = "engineering.coding" ] && wants_ponytail=1
done
if [ "$wants_ponytail" != 1 ]; then
  say "skipped    engineering.coding not selected"
elif [ "$DRY" = 1 ]; then
  say "would      claude plugin marketplace add DietrichGebert/ponytail"
  say "would      claude plugin install ponytail@ponytail -s user"
else
  has_marketplace=$(claude plugin marketplace list --json 2>/dev/null \
    | python3 -c "import json,sys; print('1' if any(m.get('name')=='ponytail' for m in json.load(sys.stdin)) else '0')" 2>/dev/null || echo 0)
  if [ "$has_marketplace" = 1 ]; then
    say "ok         marketplace ponytail already added"
  elif claude plugin marketplace add DietrichGebert/ponytail >/dev/null 2>&1; then
    say "added      marketplace ponytail"
  else
    say "FAILED     marketplace add — run by hand: claude plugin marketplace add DietrichGebert/ponytail"
  fi

  has_plugin=$(claude plugin list --json 2>/dev/null \
    | python3 -c "import json,sys; print('1' if any(p.get('name')=='ponytail' for p in json.load(sys.stdin)) else '0')" 2>/dev/null || echo 0)
  if [ "$has_plugin" = 1 ]; then
    say "ok         ponytail already installed"
  elif claude plugin install ponytail@ponytail -s user >/dev/null 2>&1; then
    say "installed  ponytail — restart Claude Code to activate"
  else
    say "FAILED     plugin install — run by hand: claude plugin install ponytail@ponytail"
  fi
fi

# ---------------------------------------------------------------- finish

# A previous run may have linked things this one no longer installs (agents and
# commands, before they were removed). Remove those links — only symlinks, only
# ones the old manifest recorded.
if [ -f "$MANIFEST" ]; then
  while IFS= read -r p; do
    [ -L "$p" ] && ! grep -qxF "$p" "$MANIFEST.new" || continue
    [ "$DRY" = 1 ] || rm "$p"
    say "removed    $(short "$p")  (no longer installed)"
  done < "$MANIFEST"
fi

if [ "$DRY" != 1 ]; then
  mv "$MANIFEST.new" "$MANIFEST"
fi
trap - EXIT
rm -f "$MANIFEST.new"

head_ "Done."
say "$created installed, $skipped already correct, $conflicts conflict(s)"
[ "$conflicts" -gt 0 ] && say "rerun with --force to replace conflicting paths"
say "manifest: $(short "$MANIFEST")"
exit 0
