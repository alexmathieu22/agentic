// Today's and the latest earlier daily notes: a link, plus highlights of what each says I did.
// Read-only; the vault stays the source of truth, and only the highlights cross the API, never the note.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

export const VAULT = process.env.OBSIDIAN_VAULT_PATH ?? join(homedir(), 'Repos', 'obsidian');
const TZ = 'America/Toronto';

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekday = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

// `recap` sources get a "what I did" tile: yesterday's (or the latest earlier) note and today's.
const SOURCES = [
  { label: 'Daily note', context: 'personal', file: (d) => `Daily/${d}.md` },
  { label: 'Job recap', context: 'job', recap: true, file: (d) => `Job/Daily recaps/${d.slice(0, 4)}/${d}.md` },
];

const plain = (s) => s
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1') // [[note|text]] -> text
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
  .replace(/`|\*\*/g, ''); // inline code and bold marks; a lone * (a11y/*) stays
const firstSentence = (s, max = 120) => {
  const t = plain(s).trim().split(/(?<=[.;])\s/)[0].replace(/[.;]$/, '');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// The main points of a note's "## What I did" section: each "### " heading with the first sentence of its
// first bullet, or, in a note without headings, its top-level bullets.
export function highlights(md, max = 6) {
  const lines = md.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
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
  const read = (src, date) => readFile(join(VAULT, src.file(date)), 'utf8').catch(() => null);
  const entry = (src, date, kind, raw) => ({
    label: src.label, context: src.context, recap: !!src.recap, kind, date, weekday: weekday(date),
    yesterday: date === addDays(d, -1), exists: raw !== null, highlights: raw === null ? [] : highlights(raw),
    uri: `obsidian://open?vault=${encodeURIComponent(basename(VAULT))}&file=${encodeURIComponent(src.file(date).replace(/\.md$/, ''))}`,
    draftUrl: src.recap && kind === 'today' && raw === null
      ? `claude://code/new?folder=${encodeURIComponent(VAULT)}&q=${encodeURIComponent(draftPrompt(date))}` : undefined,
  });
  const out = [];
  for (const src of SOURCES) {
    out.push(entry(src, d, 'today', await read(src, d)));
    if (!src.recap) continue;
    // Yesterday, or the latest recap before it (a weekend or day off has none).
    for (let i = 1; i <= 14; i++) {
      const raw = await read(src, addDays(d, -i));
      if (raw !== null) { out.push(entry(src, addDays(d, -i), 'previous', raw)); break; }
    }
  }
  return out;
}
