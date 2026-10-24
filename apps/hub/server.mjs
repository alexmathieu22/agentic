// Local-only dashboard server: /api/today aggregates every source; everything else is static.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './today.mjs';
import { contextOf, loadContexts } from './contexts.mjs';
import * as sessions from './sources/sessions.mjs';
import * as github from './sources/github.mjs';
import * as linear from './sources/linear.mjs';
import * as vault from './sources/vault.mjs';
import * as running from './panels/running.mjs';
import * as budget from './panels/budget.mjs';

const PUBLIC = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const PANELS = { running, budget };
// Listening on loopback isn't enough: DNS rebinding lets any web page reach this server under its own
// hostname and read the answers as same-origin. Only the dashboard's own Host gets a reply.
const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

// One failing source must not blank the dashboard; it is reported and the rest still render.
const settle = async (name, mod) => {
  try { return { name, ok: true, data: await mod.load() }; }
  catch (e) { return { name, ok: false, error: String(e.message ?? e).split('\n')[0], data: [] }; }
};

async function today() {
  const contexts = await loadContexts();
  const r = await Promise.all([settle('sessions', sessions), settle('github', github), settle('linear', linear), settle('vault', vault)]);
  const [s, g, l, v] = r;
  const status = Object.fromEntries(r.map((x) => [x.name, { ok: x.ok, error: x.error }]));
  const out = {};
  for (const [key, c] of Object.entries(contexts)) {
    const mine = (items) => items.filter((x) => contextOf(contexts, x) === key);
    out[key] = {
      label: c.label,
      // Sources with no connector yet (jira, gitlab) still get a pill, honestly marked.
      sources: Object.fromEntries(['sessions', ...(c.sources ?? []), 'vault'].map((n) => [n, status[n] ?? { ok: false, error: 'no connector yet' }])),
      notes: v.data.filter((n) => n.context === key),
      panels: await Promise.all((c.panels ?? []).map((name) => settle(name, PANELS[name]))),
      ...build({ sessions: mine(s.data), prs: mine(g.data), tickets: mine(l.data) }),
    };
  }
  return { date: vault.today(), contexts: out };
}

createServer(async (req, res) => {
  if (!HOSTS.has(req.headers.host)) return res.writeHead(403).end('unknown host');
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/api/today') {
    const body = await today().then(JSON.stringify, (e) => JSON.stringify({ error: String(e.message) }));
    res.writeHead(200, { 'content-type': 'application/json' }).end(body);
    return;
  }
  if (path === '/api/issues') {
    // Only repos we already know from sessions; the query names a project, never a path.
    const name = new URL(req.url, 'http://x').searchParams.get('project')?.toLowerCase();
    const repo = (await sessions.load()).map((s) => s.repo).find((r) => r.split('/').pop().toLowerCase() === name);
    const body = repo
      ? await github.issues(repo).then(JSON.stringify, (e) => JSON.stringify({ error: String(e.message).split('\n')[0] }))
      : JSON.stringify({ error: 'unknown project' });
    res.writeHead(200, { 'content-type': 'application/json' }).end(body);
    return;
  }
  if (path === '/api/running') {
    const body = await running.detail().then(JSON.stringify, (e) => JSON.stringify({ error: String(e.message) }));
    res.writeHead(200, { 'content-type': 'application/json' }).end(body);
    return;
  }
  const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  const body = await readFile(file).catch(() => null);
  if (body === null) return res.writeHead(404).end('not found');
  // no-store: it's a local tool, and a stale cached script silently hides every UI change
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
}).listen(PORT, '127.0.0.1', () => console.log(`hub on http://localhost:${PORT}`));
