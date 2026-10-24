const $ = (id) => document.getElementById(id);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const rel = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 6e4);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

const link = (url, html) => (url ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${html}</a>` : html);

function session(s) {
  const cmd = `cd '${s.cwd}' && claude --resume ${s.id}`;
  return `<div class="row"><div class="t"><span>${esc(s.title)}</span>
    <small>${esc(s.branch || 'no branch')} · ${rel(s.updatedAt)}${s.prUrl ? ' · PR' : ''}</small></div>
    <button data-copy="${esc(cmd)}">Resume</button></div>`;
}
const pr = (p) => `<div class="row"><div class="t"><span>${link(p.url, `<span class="tag ${p.role === 'reviewer' ? 'go' : ''}">${p.role === 'reviewer' ? 'review' : p.draft ? 'draft' : 'PR'}</span>#${p.number} ${esc(p.title)}`)}</span>
  <small>${rel(p.updatedAt)}</small></div></div>`;
const ticket = (t) => `<div class="row"><div class="t"><span>${link(t.url, `<span class="tag ${t.started ? 'go' : ''}">${esc(t.state)}</span>${esc(t.id)} ${esc(t.title)}`)}</span>
  <small>${rel(t.updatedAt)}</small></div></div>`;

function project(p) {
  const n = (a, w) => (a.length ? `${a.length} ${w}${a.length > 1 && w !== 'PR' ? 's' : w === 'PR' && a.length > 1 ? 's' : ''}` : '');
  const counts = [n(p.sessions, 'session'), n(p.prs, 'PR'), n(p.tickets, 'ticket')].filter(Boolean).join(' · ');
  return `<article class="card"><h3>${esc(p.name)}</h3><div class="counts">${counts}</div>
    ${p.tickets.map(ticket).join('')}${p.prs.map(pr).join('')}${p.sessions.slice(0, 4).map(session).join('')}</article>`;
}

function panel(p) {
  const body = !p.ok ? `<small class="counts">${esc(p.error)}</small>`
    : p.name === 'running' ? running(p.data)
    : `<pre class="plain">${esc(p.data.text)}</pre>`;
  return `<article class="card"><h3>${esc(p.name[0].toUpperCase() + p.name.slice(1))}</h3>${body}</article>`;
}
function running({ plannedKm, doneKm, today }) {
  const pct = plannedKm ? Math.min(100, (doneKm / plannedKm) * 100) : 0;
  const t = today.map((r) => `${esc(r.kind)} ${r.distance_km} km: ${esc(r.verdict)}`).join(' · ') || 'Nothing planned today';
  return `<div class="big">${doneKm} / ${plannedKm} km</div><div class="bar"><i style="width:${pct}%"></i></div><small class="counts">${t}</small>`;
}

let data, current;
try { current = localStorage.getItem('hub-tab'); } catch {}

function render() {
  const keys = Object.keys(data.contexts);
  if (!keys.includes(current)) current = keys[0];
  const c = data.contexts[current];
  $('date').textContent = new Date(data.date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  $('greeting').textContent = greeting();
  $('tabs').innerHTML = keys.map((k) => `<button data-tab="${k}" aria-selected="${k === current}">${esc(data.contexts[k].label)}</button>`).join('');
  $('status').innerHTML = Object.entries(c.sources)
    .map(([k, v]) => `<span class="pill ${v.ok ? '' : 'off'}" title="${esc(v.error)}">${k}${v.ok ? '' : ': ' + esc(v.error)}</span>`).join('');
  $('panels').innerHTML = c.panels.length ? `<h2>At a glance</h2><div class="panels">${c.panels.map(panel).join('')}</div>` : '';
  $('attention').innerHTML = c.attention.length
    ? `<h2>Needs you</h2><div class="next">${c.attention.map((a) => `<a ${a.url ? `href="${esc(a.url)}" target="_blank" rel="noreferrer"` : ''}>${esc(a.text)}<small>${esc(a.project)}</small></a>`).join('')}</div>`
    : '';
  $('projects').innerHTML = `<h2>Active projects</h2>` + (c.projects.map(project).join('') || '<p class="empty">Nothing active in the last 14 days.</p>');
  $('notes').innerHTML = `<h2>Today in the vault</h2>` + (c.notes.map((n) =>
    `<article class="card"><h3>${link(n.uri, esc(n.label))}</h3><div class="note">${esc(n.body) || '<i>empty</i>'}</div></article>`).join('')
    || '<p class="empty">No notes yet today.</p>');
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (t) {
    current = t.dataset.tab;
    try { localStorage.setItem('hub-tab', current); } catch {}
    return render();
  }
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  navigator.clipboard.writeText(b.dataset.copy);
  b.textContent = 'Copied';
  setTimeout(() => (b.textContent = 'Resume'), 1200);
});

async function load() {
  $('refresh').textContent = '…';
  data = await (await fetch('/api/today')).json();
  if (data.error) return ($('status').innerHTML = `<span class="pill off">${esc(data.error)}</span>`);
  render();
  $('refresh').textContent = 'Refresh';
}
$('refresh').onclick = load;
load();
