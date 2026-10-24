// My open Linear issues. Needs LINEAR_API_KEY, or the key in ~/.config/agents/linear-api-key. A Jira adapter would sit beside this one.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const QUERY = `{ viewer { assignedIssues(first: 50, filter: { state: { type: { in: ["started", "unstarted"] } } }) {
  nodes { identifier title url updatedAt state { name type } project { name } team { key } } } } }`;

export async function load() {
  const key = process.env.LINEAR_API_KEY
    ?? (await readFile(join(homedir(), '.config', 'agents', 'linear-api-key'), 'utf8').catch(() => '')).trim();
  if (!key) throw new Error('no Linear key: see apps/hub/README.md');
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: key },
    body: JSON.stringify({ query: QUERY }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(body.errors?.[0]?.message ?? `HTTP ${res.status}`);
  return body.data.viewer.assignedIssues.nodes.map((t) => ({
    source: 'linear', id: t.identifier, title: t.title, url: t.url, state: t.state.name, started: t.state.type === 'started',
    project: t.project?.name ?? t.team.key, updatedAt: t.updatedAt,
  }));
}
