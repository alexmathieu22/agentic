// Today's and the latest earlier daily notes (a link plus highlights of what each says I did) and each
// context's to-do note (its unchecked items). Read-only; the vault stays the source of truth, and only
// those highlights and items cross the API, never a whole note.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

export const VAULT = process.env.OBSIDIAN_VAULT_PATH ?? join(homedir(), 'Repos', 'obsidian');
const TZ = 'America/Toronto';
const TODO_LIMIT = 8; // to-do items shown before "+N more in the note"
const HIGHLIGHT_LIMIT = 6; // sections shown per recap
const HIGHLIGHT_CHARS = 120; // length of a highlight's detail line
const LOOKBACK_DAYS = 14; // how far back to look for the latest earlier recap

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekday = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

// `recap` sources get a "what I did" tile: yesterday's (or the latest earlier) note and today's.
// `todo` is the note the user edits by hand; `up` is the area hub a new one links to.
const SOURCES = [
  { label: 'Daily note', context: 'personal', file: (d) => `Daily/${d}.md`, todo: 'Life/Personal todo.md', up: 'Life' },
  { label: 'Job recap', context: 'job', recap: true, file: (d) => `Job/Daily recaps/${d.slice(0, 4)}/${d}.md`, todo: 'Job/Job todo.md', up: 'Job' },
];

const plain = (s) => s
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1') // [[note|text]] -> text
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
  .replace(/`|\*\*/g, ''); // inline code and bold marks; a lone * (a11y/*) stays
const firstSentence = (s, max = HIGHLIGHT_CHARS) => {
  const t = plain(s).trim().split(/(?<=[.;])\s/)[0].replace(/[.;]$/, '');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// A note's lines without its frontmatter or fenced code, so an example checklist pasted in a code
// block is not a task, and a CRLF note parses like an LF one.
function contentLines(md) {
  let fenced = false;
  return md.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n').filter((l) => {
    if (/^\s*(```|~~~)/.test(l)) { fenced = !fenced; return false; }
    return !fenced;
  });
}

// The main points of a note's "## What I did" section: each "### " heading with the first sentence of its
// first bullet, or, in a note without headings, its top-level bullets.
export function highlights(md, max = HIGHLIGHT_LIMIT) {
  const lines = contentLines(md);
  const start = lines.findIndex((l) => /^## What I did\b/.test(l));
  if (start < 0) return [];
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  const out = [];
  let cur = null;
  for (const l of lines.slice(start + 1, end < 0 ? undefined : end)) {
    if (l.startsWith('### ')) out.push((cur = { title: plain(l.slice(4)).trim(), detail: '' }));
    else if (/^[-*] /.test(l)) {
      if (!cur) out.push({ title: firstSentence(l.slice(2)), detail: '' });
      else cur.detail ||= firstSentence(l.slice(2));
    }
  }
  return out.slice(0, max);
}

// Unchecked tasks ("- [ ] text") of a note, in order. Empty checkboxes are skipped.
export function openTasks(md) {
  return contentLines(md)
    .flatMap((l) => { const m = l.match(/^\s*[-*] \[ \] (\S.*)$/); return m ? [plain(m[1]).trim()] : []; });
}

// What to hand Claude when a recap doesn't exist yet. It opens in the vault, so the vault's own
// Agent Instructions apply; the draft is shown before anything is written.
const draftPrompt = (date) => `Write my job daily recap for ${date}.

Follow the daily-note routine in Agent Instructions.md: create Job/Daily recaps/${date.slice(0, 4)}/${date}.md from Templates/Daily.md (with "Up: [[Job]]") and link it once from Job/Job.md.

Ground "What I did" in evidence only, for ${date} in America/Toronto time:
- my Claude Code sessions that day
- my GitLab contributions that day: merge requests opened, merged and reviewed, pipelines, commits (use glab or the GitLab API)

Separate completed work from plans, investigations and unverified outcomes, and do not infer deployment or success from intent alone. Show me the draft before writing the file.`;

export async function load() {
  const d = today();
  const noteUri = (file) => `obsidian://open?vault=${encodeURIComponent(basename(VAULT))}&file=${encodeURIComponent(file.replace(/\.md$/, ''))}`;
  const read = (src, date) => readFile(join(VAULT, src.file(date)), 'utf8').catch(() => null);
  const entry = (src, date, kind, raw) => ({
    label: src.label, context: src.context, recap: !!src.recap, kind, date, weekday: weekday(date),
    yesterday: date === addDays(d, -1), exists: raw !== null,
    // Only recaps show highlights; the personal daily note stays a link, so none of its text leaves the vault.
    highlights: src.recap && raw !== null ? highlights(raw) : [],
    uri: noteUri(src.file(date)),
    draftUrl: src.recap && kind === 'today' && raw === null
      ? `claude://code/new?folder=${encodeURIComponent(VAULT)}&q=${encodeURIComponent(draftPrompt(date))}` : undefined,
  });
  const out = [];
  for (const src of SOURCES) {
    const todoRaw = await readFile(join(VAULT, src.todo), 'utf8').catch(() => null);
    const tasks = todoRaw === null ? [] : openTasks(todoRaw);
    out.push({
      label: 'To do', context: src.context, kind: 'todo', exists: todoRaw !== null, items: tasks.slice(0, TODO_LIMIT), total: tasks.length,
      uri: noteUri(src.todo),
      // A missing note is created through Obsidian itself, so this server never writes to the vault.
      createUrl: todoRaw === null
        ? `obsidian://new?vault=${encodeURIComponent(basename(VAULT))}&file=${encodeURIComponent(src.todo.replace(/\.md$/, ''))}&content=${encodeURIComponent(`---\ntype: note\ncreated: ${d}\ntags: [todo]\n---\n\nUp: [[${src.up}]]\n\n## To do\n\n- [ ] \n`)}`
        : undefined,
    });
    out.push(entry(src, d, 'today', await read(src, d)));
    if (!src.recap) continue;
    // Yesterday, or the latest recap before it (a weekend or day off has none).
    for (let i = 1; i <= LOOKBACK_DAYS; i++) {
      const raw = await read(src, addDays(d, -i));
      if (raw !== null) { out.push(entry(src, addDays(d, -i), 'previous', raw)); break; }
    }
  }
  return out;
}
