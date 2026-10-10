---
name: note-taking
description: >
  Use when saving, filing or summarising anything in the user's Obsidian vault —
  "take a note", "save this", "capture this page", "add to my notes", "write up
  what I learned", or "do my daily note" / "wrap up the day". Sets where notes go
  and how they are formatted, then points at the Obsidian skills that do the
  mechanics. For Obsidian syntax alone, use obsidian-markdown.
x-domain: life.notes
x-requires: [obsidian]
---

# Note-taking

The user's house style for their Obsidian vault. This skill decides **where a
note goes and what it looks like**; the mechanics belong to the skills below.

| Need | Skill |
|---|---|
| Wikilinks, callouts, properties, embeds | `obsidian-markdown` |
| Read, create, search, set properties, daily note | `obsidian-cli` (Obsidian must be open) |
| Turn a URL into clean Markdown | `defuddle` |
| Render a note from a template plus data | `knap` |
| Database-style views of notes | `obsidian-bases` — only if asked |
| Visual maps | `json-canvas` — only if asked |

## When this applies

Any write into the vault. Not for reading or searching it — that is just
`obsidian-cli`. Not for notes that belong in a repo (docs, ADRs).

## Two kinds of note

- **Atomic note** — one idea, one file, filed in a category folder:
  `<Category>/<Subcategory>/<Title>.md`. Most notes are this.
- **Daily note** — one per day, a log and an index. It links to the atomic notes
  from that day and holds no durable content of its own.

## Writing an atomic note

1. **Look before filing.** List the vault's existing folders and `search` for the
   topic. Extend an existing note rather than adding a near-duplicate. File
   under an existing folder; ask before creating a new top-level category.
2. **One idea per note.** If it has two, write two and link them.
3. **Title** is a plain-language claim or topic in sentence case, and is the
   filename. No dates in the title.
4. **Properties**, via `obsidian-markdown`:
   ```yaml
   ---
   type: note
   created: 2026-10-10
   tags: [topic]
   source: https://…      # only for captured material
   ---
   ```
   Tags are few and topical; the folder carries the category.
5. **Link generously.** Use `[[wikilinks]]` for anything in the vault, with
   `search` to find the right target. Link to notes that exist; add a link to a
   note that doesn't yet only when the user wants a stub.
6. **Capturing a page:** `defuddle parse <url> --md`, then summarise in the
   user's words with the source in properties. Use `knap` only when a template
   already exists in the vault for that kind of capture.
7. **Create silently** (`obsidian create … silent`) so the user's window isn't
   hijacked, then report the path.

## Daily note (end of day)

Run when asked to wrap up the day. Re-running must update, never duplicate.

1. `obsidian daily:read` to see what is already there. The CLI respects the
   user's daily-note folder and template; do not build the path by hand.
2. Find notes touched today with `obsidian eval`, comparing each file's
   `stat.ctime` (created) and `stat.mtime` (updated) to the start of today.
   Exclude the daily note itself and anything under the daily-notes folder.
3. Write two sections, adding only what is missing and keeping any text the user
   wrote:
   ```markdown
   ## Notes
   - [[Note title]] — created: what it captures
   - [[Other note]] — updated: what changed

   ## What I did
   - One line per thing done today, from the conversation and the notes above.
   ```
4. `obsidian daily:append` for new lines. If a section must change in place,
   edit the file instead of appending a second copy.
5. Do not invent activity. If "what I did" can't be grounded in the session or
   the notes, ask.

## Done when

The note exists in the right folder with valid properties and working links, and
you've said the path. For a daily note: every note touched today is linked
exactly once, and nothing the user wrote was removed.
