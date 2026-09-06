#!/usr/bin/env bash
#
# Install this repo's content into Claude Code.
#
#   ./install.sh                    link everything
#   ./install.sh --dry-run          show what would happen, touch nothing
#   ./install.sh --uninstall        remove exactly what this script created
#   ./install.sh --force            replace files this script did not create
#   ./install.sh --context <name>   add a domain context to the global memory
#                                   (repeatable, e.g. engineering.product)
#   ./install.sh --no-context       install no contexts at all
#
# Symlinks, so edits in the repo are live. Idempotent. Never removes anything
# it did not create — a manifest records every path, and uninstall reverses it.

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
    -h|--help)    sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
[ -n "$CONTEXTS" ] || CONTEXTS="$DEFAULT_CONTEXTS"
[ "$NOCTX" = 1 ] && CONTEXTS=""

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
  say "MCP servers, plugins and settings.json hooks are not touched — remove"
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

link() {
  local src="$1" dst="$2"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    echo "$dst" >> "$MANIFEST.new"; skipped=$((skipped+1)); return 0
  fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    if [ "$FORCE" != 1 ]; then
      say "CONFLICT   $(short "$dst")  exists and was not created here — --force to replace"
      conflicts=$((conflicts+1)); return 0
    fi
  fi
  if [ "$DRY" != 1 ]; then
    mkdir -p "$(dirname "$dst")"
    rm -rf "$dst"
    ln -s "$src" "$dst"
  fi
  echo "$dst" >> "$MANIFEST.new"
  say "linked     $(short "$dst")"
  created=$((created+1))
}

# ---------------------------------------------------------------- install

head_ "Installing $REPO"
say "into $(short "$TARGET")"
[ "$DRY" = 1 ] && say "(dry run — nothing will be written)"

# --- skills, agents, commands ------------------------------------------------
# Claude Code scans one flat directory per kind, so the layers are flattened
# here. Names are unique repo-wide, which is what makes that safe.

head_ "Skills"
while IFS= read -r d; do
  for s in "$d"/*/; do
    [ -f "$s/SKILL.md" ] || continue
    link "${s%/}" "$TARGET/skills/$(basename "$s")"
  done
done < <(find "$REPO/core" "$REPO/domains" -type d -name skills | sort)

for kind in agents commands; do
  head_ "$(printf '%s' "$kind" | tr '[:lower:]' '[:upper:]' | cut -c1)$(printf '%s' "$kind" | cut -c2-)"
  while IFS= read -r d; do
    for f in "$d"/*.md; do
      [ -f "$f" ] || continue
      link "$f" "$TARGET/$kind/$(basename "$f")"
    done
  done < <(find "$REPO/core" "$REPO/domains" -type d -name "$kind" | sort)
done

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
if ! command -v claude >/dev/null 2>&1; then
  say "skipped    claude CLI not on PATH"
elif ! command -v python3 >/dev/null 2>&1; then
  say "skipped    python3 needed to read mcp/servers.json"
else
  existing="$(claude mcp list 2>/dev/null | sed 's/:.*//' || true)"
  while IFS=$'\t' read -r name cmd args; do
    [ -n "$name" ] || continue
    if printf '%s\n' "$existing" | grep -qx "$name"; then
      say "ok         $name already registered"
    elif [ "$DRY" = 1 ]; then
      say "would      claude mcp add -s user $name -- $cmd $args"
    else
      # shellcheck disable=SC2086
      if claude mcp add -s user "$name" -- $cmd $args >/dev/null 2>&1; then
        say "added      $name"
      else
        say "FAILED     $name — run by hand: claude mcp add -s user $name -- $cmd $args"
      fi
    fi
  done < <(python3 - "$REPO/mcp/servers.json" <<'PY'
import json, sys
for n, s in json.load(open(sys.argv[1])).get("mcpServers", {}).items():
    if isinstance(s, dict) and "command" in s:
        print("\t".join([n, s["command"], " ".join(s.get("args", []))]))
PY
  )
fi

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
elif ! command -v claude >/dev/null 2>&1; then
  say "skipped    claude CLI not on PATH"
elif ! command -v python3 >/dev/null 2>&1; then
  say "skipped    python3 needed to check installed plugins"
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

# --- hooks -------------------------------------------------------------------

head_ "Hooks"
hook_count=$(find "$REPO/hooks" -maxdepth 1 -name '*.sh' -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$hook_count" = 0 ]; then
  say "none       hooks/ contains no executables — nothing to wire"
  say "           (the contract is defined; no hook has earned its place yet)"
elif [ "$DRY" = 1 ]; then
  say "would      merge $hook_count hook(s) into $(short "$TARGET/settings.json")"
else
  say "found $hook_count hook(s) — merging into $(short "$TARGET/settings.json")"
  python3 "$(dirname "${BASH_SOURCE[0]}")/merge-hooks.py" "$REPO" "$TARGET/settings.json"
fi

# ---------------------------------------------------------------- finish

if [ "$DRY" != 1 ]; then
  mv "$MANIFEST.new" "$MANIFEST"
fi
trap - EXIT
rm -f "$MANIFEST.new"

head_ "Done."
say "$created linked, $skipped already correct, $conflicts conflict(s)"
[ "$conflicts" -gt 0 ] && say "rerun with --force to replace conflicting paths"
say "manifest: $(short "$MANIFEST")"
exit 0
