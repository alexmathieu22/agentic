// Links to today's personal daily note and job recap. Read-only; the vault stays the source of truth.
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

export const VAULT = process.env.OBSIDIAN_VAULT_PATH ?? join(homedir(), 'Repos', 'obsidian');
const TZ = 'America/Toronto';

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD

export async function load() {
  const d = today();
  const targets = [
    { label: 'Daily note', context: 'personal', file: `Daily/${d}.md` },
    { label: 'Job recap', context: 'job', file: `Job/Daily recaps/${d.slice(0, 4)}/${d}.md` },
  ];
  const out = [];
  for (const t of targets) {
    const exists = await access(join(VAULT, t.file)).then(() => true, () => false);
    if (!exists) continue;
    out.push({ label: t.label, context: t.context,
      uri: `obsidian://open?vault=${encodeURIComponent(basename(VAULT))}&file=${encodeURIComponent(t.file.replace(/\.md$/, ''))}` });
  }
  return out;
}
