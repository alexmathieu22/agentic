import { esc, rel, link, section, sessionActions, skeleton } from '../lib.js';

const spark = (days) => {
  const max = Math.max(1, ...days.flatMap((d) => [d.plan, d.done]));
  return `<svg viewBox="0 0 140 40" width="140" height="40" class="chart">${days.map((d, i) =>
    `<rect x="${i * 20 + 2}" y="${40 - (d.plan / max) * 40}" width="14" height="${(d.plan / max) * 40}" rx="3" class="plan"/>
     <rect x="${i * 20 + 2}" y="${40 - (d.done / max) * 40}" width="14" height="${(d.done / max) * 40}" rx="3" class="done"/>`).join('')}</svg>`;
};

// Only blocks that lead somewhere are links; a link can't hold the vault block's own links.
const block = (title, href, body) => href
  ? `<a class="blk" href="#${href}"><h3>${title}<span>→</span></h3>${body}</a>`
  : `<div class="blk"><h3>${title}</h3>${body}</div>`;

export function render(m) {
  const running = m.panel('running'), budget = m.panel('budget');
  const headline = [
    running?.ok ? (m.behind > 0 ? `you're <mark>${m.behind} km behind</mark> your running plan` : 'your running is <mark>on plan</mark>') : '',
    m.c.attention.length ? `<mark>${m.c.attention.length} thing${m.c.attention.length === 1 ? '' : 's'}</mark> need${m.c.attention.length === 1 ? 's' : ''} you` : 'nothing is waiting on you',
    m.tickets.find((t) => t.started) ? `<mark>${esc(m.tickets.find((t) => t.started).id)}</mark> is in progress` : '',
  ].filter(Boolean).join(', ');
  const pills = Object.entries(m.c.sources).map(([k, v]) => `<span class="pill ${v.ok ? 'ok' : 'off'}" title="${esc(v.error ?? '')}">${k}</span>`).join('');

  return `<h1>Today ${headline}.</h1>
    <div class="sum"><div>
      ${section('01', 'Needs you', `<ol class="list">${m.c.attention.map((a) => `<li>${link(a.url, esc(a.text))}<small>${esc(a.project)}</small></li>`).join('') || '<li class="muted">All clear.</li>'}</ol>`)}
      ${section('02', 'Pick up', `<div class="list">${m.sessions.slice(0, 4).map((s) => `<div class="li"><div><b>${esc(s.title)}</b><small>${esc(s.project)} · ${esc(s.branch || '-')} · ${rel(s.updatedAt)}</small></div>${sessionActions(s)}</div>`).join('') || '<p class="muted pad">No sessions yet.</p>'}</div>`, 'work')}
    </div><div class="side">
      ${running ? block('Running', 'running', running.ok
        ? `<div class="big">${m.glance.doneKm}<small> / ${m.glance.plannedKm} km</small></div>${spark(m.days)}<small>${esc(m.glance.today.map((t) => `today: ${t.kind} ${t.distance_km} km, ${t.verdict}`).join(' · ') || 'rest day')}</small>`
        : `<small class="warn">${esc(running.error)}</small>`) : ''}
      ${budget ? block('Budget', 'budget', budget.ok ? `<pre class="plain">${esc(budget.data.text)}</pre>` : `<small class="warn">${esc(budget.error)}</small>`) : ''}
      ${block('Tickets', 'work', `<div class="big">${m.tickets.length}<small> open</small></div><small>${esc(m.tickets.map((t) => `${t.id} ${t.state}`).join(' · ') || 'none')}</small>`)}
      ${m.c.notes.length ? block('Vault today', '', `<div class="notes">${m.c.notes.map((n) => `<a href="${esc(n.uri)}">${esc(n.label)}</a>`).join('')}</div>`) : ''}
      ${block('Sources', '', `<div class="pills">${pills}</div>`)}
    </div></div>`;
}

export const skeletonView = () => `${skeleton.head()}
  <div class="sum"><div>
    ${skeleton.line('90px')}${skeleton.rows(3)}
    <div style="height:20px"></div>${skeleton.line('90px')}${skeleton.rows(2)}
  </div><div class="side">${skeleton.box('sk-box').repeat(3)}</div></div>`;
