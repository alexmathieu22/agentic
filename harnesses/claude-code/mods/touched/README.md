# touched

A pane for Claude Code that shows what Claude has done to your files this
session, with the repo's git state and the session's own numbers beside it.
Open it with `/touched`.

It is a Claude Code [mod](https://code.claude.com/docs/en/plugins): a plugin with
a hooks module that draws its own UI. It needs Claude Code 2.1.287 or later.

## What it shows

Three cards, top to bottom.

**Git** — the branch, total `+added -removed`, a green/red bar of the net change,
and `S` staged / `M` modified / `U` untracked counts. This is the whole repo
against its last commit, whoever changed it, so it shows even if Claude has done
nothing yet.

**Claude touched** — three tiles (edited, read only, uncommitted) and an
expanded tree of every file Claude read, edited or wrote this session:

- a file icon colored by type, a pencil for edited or an eye for read-only;
- `+added -removed` with a small diff bar, and git status letters like VS Code:
  `U` untracked, `S` staged, `M` modified, `D` deleted (a file can have two);
- click a file name to open it in your editor;
- click a folder to fold or unfold it, or use `⊟ Collapse` / `⊞ Expand` (keys
  `c` / `e`) for every folder at once;
- the section header folds the whole tree away, leaving the tiles.

**Session** — tool calls made (with how many failed and the four most used
tools), the time since the session started, and how full the context window is.

Bottom row: **Open in Visual Studio Code** (`o`) opens the session's working
folder, **Refresh** (`r`) re-reads git, **Close** (`q`).

## Refresh behaviour

The file list and the counts update as Claude works. Git status refreshes after
each `Edit` or `Write`. Changes made through `Bash` (a commit, `sed`, a checkout)
are not noticed until you press Refresh. Counts start when the mod loads, so
calls made earlier in a session are not included.

## Settings

`Editor` (under `/config`): the macOS app that opens files, default
`Visual Studio Code`. Others offered: Cursor, Zed, Sublime Text, IntelliJ IDEA,
WebStorm, PyCharm.

## What it touches

It runs `git` (read-only: `rev-parse`, `status`, `diff HEAD --numstat`) and, only
when you click, `open -a <editor> <path>`. It makes no network calls, writes no
files and sends nothing to a model. Like every mod it is not sandboxed and runs
with your permissions; the source is `hooks/`, about 500 lines.

## Limits

- Opening in an editor uses `open -a`, so it is macOS only.
- The pane is drawn from character-cell boxes with SVG icons on the desktop
  surface; a terminal gets text symbols instead. A button cannot hold an SVG, so
  the folder icon itself is not the click target, its name is.
- Staged and modified come from `git status`; renames show as `S`.

## Install and develop

`harnesses/claude-code/install.sh` adds this folder as a local marketplace
(`agentic-mods`) and installs `touched@agentic-mods`. Because the marketplace is a
folder, edits here are read in place: edit, then `/reload-plugins`.

```bash
claude plugin validate harnesses/claude-code/mods/touched
claude plugin test harnesses/claude-code/mods/touched
```

Layout: `hooks/register.tsx` (events, state, the pane's buttons),
`hooks/variants.tsx` (the three cards), `hooks/git.ts` (parsing git output),
`hooks/icons.ts` (SVG icons and bars), `types/index.d.ts` (the state contract).
