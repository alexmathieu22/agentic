// Which life a thing belongs to. ~/.config/agents/hub.json overrides the default, per machine.
// A tracker or forge listed under a context's `sources` claims its items and is shown as that
// context's status pill; everything else (sessions) falls into the FIRST context, so put the one that matches this computer first.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT = {
  personal: { label: 'Personal', sources: ['linear', 'github'], panels: ['running', 'budget'] },
  job: { label: 'Job', sources: ['jira', 'gitlab'] },
};

export async function loadContexts() {
  const file = process.env.HUB_CONFIG ?? join(homedir(), '.config', 'agents', 'hub.json');
  const raw = await readFile(file, 'utf8').catch(() => null);
  return raw === null ? DEFAULT : JSON.parse(raw);
}

export function contextOf(contexts, { source }) {
  return Object.keys(contexts).find((k) => source && contexts[k].sources?.includes(source)) ?? Object.keys(contexts)[0];
}
