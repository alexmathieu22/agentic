// Shell: loads data, routes #page, switches context and theme, runs the ⌘K search.
import { esc, rel, model, getJSON } from './lib.js';
import * as today from './pages/today.js';
import * as work from './pages/work.js';
import * as running from './pages/running.js';
import * as budget from './pages/budget.js';

const PAGES = { today, work, running, budget };
const $ = (id) => document.getElementById(id);
const state = { data: null, ctx: null, running: null, issues: {}, work: null };

// Running and budget pages exist only in a context that lists those panels.
const pagesFor = (c) => ['today', 'work', ...c.panels.map((p) => p.name).filter((n) => n in PAGES)];

function draw() {
  const c = state.data.contexts[state.ctx];
  const pages = pagesFor(c);
  const page = pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
  $('ctx').innerHTML = Object.entries(state.data.contexts)
    .map(([k, x]) => `<button data-ctx="${k}" class="${k === state.ctx ? 'on' : ''}">${esc(x.label)}</button>`).join('');
  $('pages').innerHTML = pages.map((p) => `<a href="#${p}" class="${p === page ? 'on' : ''}">${p}</a>`).join('');
  const date = new Date(state.data.date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  $('page').innerHTML = `<p class="date">${date} · ${esc(c.label)}</p>` + PAGES[page].render(model(state), state, draw);
  $('page').setAttribute('aria-busy', 'false');
  // Today's running tile charts the week too, so load it wherever a running panel is shown.
  if ((page === 'running' || (page === 'today' && c.panels.some((p) => p.name === 'running'))) && !state.running) loadRunning();
}

async function loadRunning() {
  state.running = { loading: true };
  state.running = await getJSON('/api/running');
  draw();
}

// Theme: follows the OS until toggled, then remembered.
let theme = document.documentElement.dataset.theme; // set before first paint by index.html
const applyTheme = () => {
  document.documentElement.dataset.theme = theme;
  $('theme').textContent = theme === 'dark' ? '☀︎ Light' : '☾ Dark';
};
applyTheme();

// ⌘K search. One Esc closes it, and so does losing focus: some hosts swallow the first Esc and only blur.
let query = '', sel = 0, open = false, all = [], list = [];
const items = () => {
  const m = model(state);
  return [
    ...pagesFor(m.c).filter((p) => p !== 'today').map((p) => ({ label: p[0].toUpperCase() + p.slice(1), hint: 'page', go: `#${p}` })),
    ...m.sessions.slice(0, 40).map((s) => ({ label: s.title, hint: `${s.project} · ${rel(s.updatedAt)}`, session: s })),
    ...m.c.attention.map((a) => ({ label: a.text, hint: a.project, url: a.url })),
    ...m.tickets.map((t) => ({ label: `${t.id} ${t.title}`, hint: t.state, url: t.url })),
  ];
};
const paint = () => {
  const t = query.toLowerCase();
  list = (t ? all.filter((i) => (i.label + i.hint).toLowerCase().includes(t)) : all).slice(0, 40);
  sel = Math.min(sel, Math.max(0, list.length - 1));
  $('res').innerHTML = list.map((i, n) => `<div class="hit ${n === sel ? 'sel' : ''}" data-n="${n}"><span>${esc(i.label)}</span><small>${esc(i.hint)}${i.session ? ' · ↵ opens in Claude' : ''}</small></div>`).join('')
    || '<div class="hit"><small>No matches</small></div>';
  $('res').querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
};
const openPalette = () => { open = true; all = items(); $('pal').hidden = false; $('q').value = query; paint(); requestAnimationFrame(() => $('q').focus()); };
const closePalette = () => { open = false; $('pal').hidden = true; query = ''; sel = 0; $('q').value = ''; };
const choose = (i) => {
  if (!i) return;
  closePalette();
  if (i.go) location.hash = i.go;
  else if (i.url) window.open(i.url, '_blank', 'noreferrer');
  else if (i.session) location.href = i.session.desktopId
    ? `claude://code/continue?session=${encodeURIComponent(i.session.desktopId)}`
    : `claude://code/new?folder=${encodeURIComponent(i.session.repo)}`;
};
$('q').oninput = () => { query = $('q').value; sel = 0; paint(); };
$('q').onkeydown = (e) => {
  if (e.key === 'ArrowDown') { sel = Math.min(list.length - 1, sel + 1); paint(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
  if (e.key === 'Enter') choose(list[sel]);
};
$('q').onblur = () => { if (open) closePalette(); };
$('res').onmousedown = (e) => e.preventDefault(); // clicking a result must not count as leaving the input
$('res').onclick = (e) => { const h = e.target.closest('.hit[data-n]'); if (h) choose(list[+h.dataset.n]); };
$('pal').onclick = (e) => { if (e.target === $('pal')) closePalette(); };

addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); closePalette(); }
}, true);
addEventListener('keydown', (e) => {
  if ((e.metaKey && e.key === 'k') || (e.key === '/' && !/INPUT|TEXTAREA/.test(e.target.tagName))) { e.preventDefault(); openPalette(); }
});

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-palette]')) return openPalette();
  if (t.closest('#theme')) {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('hub-theme', theme); } catch {}
    return applyTheme();
  }
  const ctx = t.closest('[data-ctx]');
  if (ctx) {
    state.ctx = ctx.dataset.ctx;
    try { localStorage.setItem('hub-ctx', state.ctx); } catch {}
    if (location.hash && location.hash !== '#today') location.hash = '#today';
    return draw();
  }
  const w = t.closest('[data-work]');
  if (w) { state.work = w.dataset.work; return draw(); }
});
addEventListener('hashchange', () => state.data && draw());

// Before data: the skeleton of the page being opened, so it doesn't turn into a different layout.
$('page').innerHTML = (PAGES[location.hash.slice(1)] ?? today).skeletonView();
state.data = await getJSON('/api/today');
if (state.data.error) {
  $('page').innerHTML = `<p class="warn">${esc(state.data.error)}</p>`;
} else {
  try { state.ctx = localStorage.getItem('hub-ctx'); } catch {}
  if (!(state.ctx in state.data.contexts)) state.ctx = Object.keys(state.data.contexts)[0];
  draw();
}
