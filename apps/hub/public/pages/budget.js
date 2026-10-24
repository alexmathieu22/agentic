import { esc, section, skeleton } from '../lib.js';

// Shows what the budget CLI says; categories and history need the CLI to expose more first.
export function render(m) {
  const p = m.panel('budget');
  if (!p.ok) return `<h1>Budget</h1><p class="warn">${esc(p.error)}</p><p class="muted">Set the CLI up with the budget skill, then refresh.</p>`;
  return `<h1>Budget</h1>${section('01', 'Balance', `<pre class="plain panel">${esc(p.data.text)}</pre>`)}`;
}

export const skeletonView = () => `${skeleton.head()}${section('01', 'Balance', `<div class="panel">${skeleton.line('60%')}${skeleton.line('40%')}</div>`)}`;
