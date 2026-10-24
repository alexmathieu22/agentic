// Shared formatting and the view model every page renders from.
export const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const rel = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 6e4);
  return m < 60 ? `${Math.max(m, 1)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
export const km = (m) => (m / 1000).toFixed(1);
export const pace = (r) => {
  const s = r.duration_s / (r.distance_m / 1000);
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
};
export const link = (url, html) => (url ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${html}</a>` : html);

// claude://code/continue?session=local_… reopens that exact Desktop session. It's undocumented (read from the
// app's own link handler), so sessions Desktop doesn't know fall back to the documented claude://code/new.
export const openInClaude = (s) => s.desktopId
  ? `<a class="open" href="claude://code/continue?session=${encodeURIComponent(s.desktopId)}" title="Reopen this session in Claude Desktop">Open in Claude</a>`
  : `<a class="open" href="claude://code/new?folder=${encodeURIComponent(s.repo)}" title="Not a Desktop session; starts a new one in ${esc(s.repo)}">New in Claude</a>`;
export const sessionActions = (s) => `<span class="acts">${openInClaude(s)}</span>`;

// Grey placeholders while a page waits on data; shaped like what will land there.
export const skeleton = {
  line: (w = '100%') => `<div class="sk sk-line" style="width:${w}"></div>`,
  box: (cls) => `<div class="sk ${cls}"></div>`,
  head: () => `<div class="sk sk-line" style="width:180px"></div><div class="sk sk-h1"></div>`,
  rows: (n) => `<div class="list">${'<div class="sk-row"><div class="sk sk-line"></div></div>'.repeat(n)}</div>`,
};

export const section = (n, title, body, more) =>
  `<section><header><span class="n">${n}</span><h2>${title}</h2>${more ? `<a class="more" href="#${more}">open ${more} →</a>` : ''}</header>${body}</section>`;

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Flattens one context's projects into the lists pages need, plus running detail once it has loaded.
export function model(state) {
  const c = state.data.contexts[state.ctx];
  const flat = (key) => c.projects.flatMap((p) => p[key].map((x) => ({ ...x, project: p.name })));
  const sessions = flat('sessions').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const panel = (name) => c.panels.find((p) => p.name === name);
  const glance = panel('running')?.data ?? { plannedKm: 0, doneKm: 0, today: [] };
  const runs = state.running?.runs ?? [];  // absent while loading or on error
  const days = (state.running?.week?.days ?? []).map((d, i) => ({
    dow: DOW[i], kind: d.plans.map((p) => p.kind).join(' + ') || 'rest',
    plan: d.plans.reduce((a, p) => a + p.distance_km, 0),
    done: runs.filter((r) => r.date === d.date).reduce((a, r) => a + r.distance_m / 1000, 0),
    verdict: d.plans.map((p) => p.verdict).join(', '),
  }));
  const recent = (s) => Date.now() - Date.parse(s.updatedAt) < 3 * 864e5;
  return {
    c, sessions, prs: flat('prs'), tickets: flat('tickets'), panel, glance, runs, days,
    noPr: sessions.filter((s) => recent(s) && !s.prUrl && s.branch && !['main', 'master', 'HEAD'].includes(s.branch)).length,
    behind: Math.max(0, glance.plannedKm - glance.doneKm),
  };
}

// Sessions, runs, PRs and tickets as one chronological feed, grouped by day.
const DOT = { session: 'var(--c-session)', run: 'var(--c-run)', pr: 'var(--c-pr)', ticket: 'var(--c-ticket)' };
export function feed(m, kinds, limit = 50) {
  const ev = [
    ...m.sessions.map((s) => ({ t: s.updatedAt, k: 'session', title: s.title, sub: `${s.project} · ${s.branch || '-'}${s.prUrl ? ' · PR' : ''}`, act: sessionActions(s) })),
    ...m.runs.map((r) => ({ t: r.start_time, k: 'run', title: `${km(r.distance_m)} km run`, sub: `${pace(r)} /km · ${Math.round(r.avg_hr)} bpm` })),
    ...m.prs.map((p) => ({ t: p.updatedAt, k: 'pr', title: p.title, sub: `${p.project} · #${p.number}${p.role === 'reviewer' ? ' · review requested' : ''}`, act: link(p.url, 'open ↗') })),
    ...m.tickets.map((x) => ({ t: x.updatedAt, k: 'ticket', title: `${x.id} ${x.title}`, sub: `${x.project} · ${x.state}`, act: link(x.url, 'open ↗') })),
  ].filter((e) => kinds.includes(e.k)).sort((a, b) => b.t.localeCompare(a.t)).slice(0, limit);
  const day = (iso) => {
    const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
    return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };
  let last = '';
  return `<div class="feed panel">${ev.map((e) => {
    const g = day(e.t), head = g !== last ? `<h4>${g}</h4>` : '';
    last = g;
    return `${head}<div class="ev"><time>${new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</time><i style="background:${DOT[e.k]}"></i><div><b>${esc(e.title)}</b><small>${esc(e.sub)}</small></div>${e.act ?? ''}</div>`;
  }).join('') || '<p class="muted">Nothing here yet.</p>'}</div>`;
}
