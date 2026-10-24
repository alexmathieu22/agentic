// Claude Code sessions, read from the local transcripts. A Copilot adapter would sit beside this one.
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(homedir(), '.claude', 'projects');
// Claude Desktop keeps one file per Code session mapping its local_ id to the CLI transcript id.
const DESKTOP = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code-sessions');
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

async function desktopIds() {
  const ids = new Map();
  const ls = (...p) => readdir(join(DESKTOP, ...p)).catch(() => []);
  for (const a of await ls()) for (const b of await ls(a)) for (const f of (await ls(a, b)).filter((f) => f.startsWith('local_'))) {
    try {
      const d = JSON.parse(await readFile(join(DESKTOP, a, b, f), 'utf8'));
      if (d.cliSessionId) ids.set(d.cliSessionId, d.sessionId);
    } catch {}
  }
  return ids;
}

export async function load() {
  const out = [];
  const desktop = await desktopIds();
  for (const dir of await readdir(ROOT).catch(() => [])) {
    if (dir.includes('scratch-workspaces')) continue;
    for (const f of (await readdir(join(ROOT, dir)).catch(() => [])).filter((f) => f.endsWith('.jsonl'))) {
      const path = join(ROOT, dir, f);
      const { mtimeMs } = await stat(path);
      if (Date.now() - mtimeMs > MAX_AGE_MS) continue;
      const s = parse(await readFile(path, 'utf8'));
      const title = s.title || s.lastPrompt?.replace(/\s+/g, ' ').slice(0, 90);
      if (!s.cwd || !title) continue;
      out.push({ id: f.slice(0, -6), desktopId: desktop.get(f.slice(0, -6)), title, cwd: s.cwd, repo: repoOf(s.cwd), branch: s.branch, prUrl: s.prUrl, updatedAt: new Date(mtimeMs).toISOString() });
    }
  }
  return out;
}
