#!/usr/bin/env bash
#
# Install this repo's content into Claude Code.
#
#   ./install.sh              link everything
#   ./install.sh --dry-run    show what would happen, touch nothing
#   ./install.sh --uninstall  remove exactly what this script created
#   ./install.sh --force      replace files this script did not create
#
# Symlinks, so edits in the repo are live. Idempotent. Never removes anything
# it did not create — a manifest records every path, and uninstall reverses it.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${CLAUDE_HOME:-$HOME/.claude}"
STATE="${AGENTIC_STATE:-$HOME/.config/agents}"
MANIFEST="$STATE/claude-code.manifest"

DRY=0; UNINSTALL=0; FORCE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --force)     FORCE=1 ;;
    -h|--help)   sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

created=0; skipped=0; conflicts=0; removed=0
say()  { printf '  %s\n' "$*"; }
head_() { printf '\n%s\n' "$*"; }

# ---------------------------------------------------------------- uninstall

if [ "$UNINSTALL" = 1 ]; then
  head_ "Uninstalling from $TARGET"
  if [ ! -f "$MANIFEST" ]; then
    say "nothing to do — no manifest at $MANIFEST"
    exit 0
  fi
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ -L "$p" ]; then
      [ "$DRY" = 1 ] || rm "$p"
      say "removed  ${p/#$HOME/\~}"; removed=$((removed+1))
    elif [ -f "$p" ] && [ "$(cat "$p" 2>/dev/null)" = "@$REPO/AGENTS.md" ]; then
      # The CLAUDE.md bridge is a real file, not a link, but it is still ours
      # — and only while it contains nothing but the import we wrote.
      [ "$DRY" = 1 ] || rm "$p"
      say "removed  ${p/#$HOME/\~}"; removed=$((removed+1))
    elif [ -e "$p" ]; then
      say "kept     ${p/#$HOME/\~}  (edited since install — not ours to delete)"
    fi
  done < "$MANIFEST"
  [ "$DRY" = 1 ] || rm -f "$MANIFEST"
  head_ "Removed $removed item(s)."
  say "MCP servers and settings.json hooks are not touched — remove those with"
  say "  claude mcp remove <name> -s user"
  exit 0
fi

# ------------------------------------------------------------------- helpers

mkdir -p "$STATE"
: > "$MANIFEST.new"

# link <source> <target>
link() {
  local src="$1" dst="$2"
  if [ -L "$dst" ]; then
    if [ "$(readlink "$dst")" = "$src" ]; then
      echo "$dst" >> "$MANIFEST.new"; skipped=$((skipped+1)); return 0
    fi
  elif [ -e "$dst" ]; then
    if [ "$FORCE" != 1 ]; then
      say "CONFLICT ${dst/#$HOME/\~}  exists and was not created here — --force to replace"
      conflicts=$((conflicts+1)); return 0
    fi
  fi
  if [ "$DRY" != 1 ]; then
    mkdir -p "$(dirname "$dst")"
    rm -rf "$dst"
    ln -s "$src" "$dst"
  fi
  echo "$dst" >> "$MANIFEST.new"
  say "linked   ${dst/#$HOME/\~}"
  created=$((created+1))
}

# ---------------------------------------------------------------- install

head_ "Installing $REPO"
say "into $TARGET"
[ "$DRY" = 1 ] && say "(dry run — nothing will be written)"

# --- skills, agents, commands: flattened out of the layers -------------------
# Claude Code scans one flat directory per kind, so the layering is flattened
# here. Names are unique repo-wide, which is what makes that safe.

head_ "Skills"
for d in $(find "$REPO/core" "$REPO/domains" -type d -name skills | sort); do
  for s in "$d"/*/; do
    [ -f "$s/SKILL.md" ] || continue
    link "${s%/}" "$TARGET/skills/$(basename "$s")"
  done
done

head_ "Agents"
for d in $(find "$REPO/core" "$REPO/domains" -type d -name agents | sort); do
  for f in "$d"/*.md; do
    [ -f "$f" ] || continue
    link "$f" "$TARGET/agents/$(basename "$f")"
  done
done

head_ "Commands"
for d in $(find "$REPO/core" "$REPO/domains" -type d -name commands | sort); do
  for f in "$d"/*.md; do
    [ -f "$f" ] || continue
    link "$f" "$TARGET/commands/$(basename "$f")"
  done
done

# --- instructions ------------------------------------------------------------
# Claude Code reads CLAUDE.md, not AGENTS.md. The documented bridge is an
# import, so the global memory file points at this repo's AGENTS.md rather
# than duplicating it.

head_ "Instructions"
BRIDGE="$TARGET/CLAUDE.md"
BRIDGE_LINE="@$REPO/AGENTS.md"
if [ -e "$BRIDGE" ]; then
  if [ "$(cat "$BRIDGE" 2>/dev/null)" = "$BRIDGE_LINE" ]; then
    # Exactly our bridge and nothing else, so it is ours to keep tracking.
    echo "$BRIDGE" >> "$MANIFEST.new"
    skipped=$((skipped+1))
  elif grep -qF "$BRIDGE_LINE" "$BRIDGE" 2>/dev/null; then
    # Contains the import among the user's own content — theirs, not ours.
    say "ok       ~/.claude/CLAUDE.md already imports this repo (left alone)"
  else
    say "MANUAL   ~/.claude/CLAUDE.md exists and is yours — add this line:"
    say "           $BRIDGE_LINE"
  fi
else
  if [ "$DRY" != 1 ]; then
    mkdir -p "$TARGET"
    printf '%s\n' "$BRIDGE_LINE" > "$BRIDGE"
  fi
  echo "$BRIDGE" >> "$MANIFEST.new"
  say "wrote    ~/.claude/CLAUDE.md -> $BRIDGE_LINE"
  created=$((created+1))
fi

# --- MCP ---------------------------------------------------------------------

head_ "MCP servers"
if ! command -v claude >/dev/null 2>&1; then
  say "skipped  claude CLI not on PATH"
elif ! command -v python3 >/dev/null 2>&1; then
  say "skipped  python3 needed to read mcp/servers.json"
else
  existing="$(claude mcp list 2>/dev/null | sed 's/:.*//' || true)"
  python3 - "$REPO/mcp/servers.json" <<'PY' | while IFS=$'\t' read -r name cmd args; do
import json, sys
for n, s in json.load(open(sys.argv[1])).get("mcpServers", {}).items():
    if not isinstance(s, dict) or "command" not in s:
        continue
    print("\t".join([n, s["command"], " ".join(s.get("args", []))]))
PY
    if printf '%s\n' "$existing" | grep -qx "$name"; then
      say "ok       $name already registered"
    elif [ "$DRY" = 1 ]; then
      say "would    claude mcp add -s user $name -- $cmd $args"
    else
      # shellcheck disable=SC2086
      if claude mcp add -s user "$name" -- $cmd $args >/dev/null 2>&1; then
        say "added    $name"
      else
        say "FAILED   $name — run by hand: claude mcp add -s user $name -- $cmd $args"
      fi
    fi
  done
fi

# --- hooks -------------------------------------------------------------------
# Neutral event names map onto Claude Code's. settings.json is merged, never
# overwritten: it holds hooks this repo does not own.

head_ "Hooks"
hook_count=$(find "$REPO/hooks" -maxdepth 1 -name '*.sh' -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$hook_count" = 0 ]; then
  say "none     hooks/ contains no executables — nothing to wire"
  say "         (the contract is defined; no hook has earned its place yet)"
else
  say "found $hook_count hook(s) — merging into $TARGET/settings.json"
  [ "$DRY" = 1 ] || python3 "$(dirname "${BASH_SOURCE[0]}")/merge-hooks.py" "$REPO" "$TARGET/settings.json"
fi

# ---------------------------------------------------------------- finish

if [ "$DRY" != 1 ]; then
  mv "$MANIFEST.new" "$MANIFEST"
else
  rm -f "$MANIFEST.new"
fi

head_ "Done."
say "$created linked, $skipped already correct, $conflicts conflict(s)"
[ "$conflicts" -gt 0 ] && say "rerun with --force to replace conflicting paths"
say "manifest: ${MANIFEST/#$HOME/\~}"
exit 0
