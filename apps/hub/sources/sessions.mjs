// Claude Code sessions, read from the local transcripts. A Copilot adapter would sit beside this one.
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(homedir(), '.claude', 'projects');
const MAX_AGE_MS = 14 * 864e5;

// A worktree belongs to the repo it was cut from.
const repoOf = (cwd) => cwd.split('/.claude/worktrees/')[0];

function parse(text) {
  const s = {};
  for (const line of text.split('\n')) {
    if (!line) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.cwd) s.cwd = r.cwd;
    if (r.gitBranch) s.branch = r.gitBranch;
    if (r.type === 'custom-title') s.title = r.customTitle;
    if (r.type === 'last-prompt') s.lastPrompt = r.lastPrompt;
    if (r.type === 'pr-link') s.prUrl = r.prUrl;
  }
  return s;
}

export async function load() {
  const out = [];
  for (const dir of await readdir(ROOT).catch(() => [])) {
    if (dir.includes('scratch-workspaces')) continue;
    for (const f of (await readdir(join(ROOT, dir)).catch(() => [])).filter((f) => f.endsWith('.jsonl'))) {
      const path = join(ROOT, dir, f);
      const { mtimeMs } = await stat(path);
      if (Date.now() - mtimeMs > MAX_AGE_MS) continue;
      const s = parse(await readFile(path, 'utf8'));
      const title = s.title || s.lastPrompt?.replace(/\s+/g, ' ').slice(0, 90);
      if (!s.cwd || !title) continue;
      out.push({ id: f.slice(0, -6), title, cwd: s.cwd, repo: repoOf(s.cwd), branch: s.branch, prUrl: s.prUrl, updatedAt: new Date(mtimeMs).toISOString() });
    }
  }
  return out;
}
