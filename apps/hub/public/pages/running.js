import { esc, pace, section, feed, skeleton } from '../lib.js';

const weekChart = (days, w = 640, h = 150) => {
  const max = Math.max(1, ...days.flatMap((d) => [d.plan, d.done])), bw = w / Math.max(days.length, 1);
  return `<svg viewBox="0 0 ${w} ${h + 24}" width="100%" class="chart panel">${days.map((d, i) => `
    <rect x="${i * bw + 10}" y="${h - (d.plan / max) * h}" width="${bw - 20}" height="${(d.plan / max) * h}" rx="6" class="plan"/>
    <rect x="${i * bw + 10}" y="${h - (d.done / max) * h}" width="${bw - 20}" height="${(d.done / max) * h}" rx="6" class="done"/>
    <text x="${i * bw + bw / 2}" y="${h + 18}" text-anchor="middle" class="lbl">${d.dow}</text>`).join('')}</svg>`;
};

// Km per Monday-starting week.
const weekly = (runs) => Object.entries(runs.reduce((acc, r) => {
  const d = new Date(r.date + 'T12:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const k = d.toISOString().slice(5, 10);
  acc[k] = (acc[k] ?? 0) + r.distance_m / 1000;
  return acc;
}, {})).sort();

const body = () => `<div class="stats">${`<div>${skeleton.line('50%')}${skeleton.line('80%')}</div>`.repeat(4)}</div>
  ${section('01', 'This week, plan vs done', skeleton.box('sk-chart'))}
  ${section('02', 'Weekly volume', `<div class="panel">${skeleton.line().repeat(4)}</div>`)}`;
export const skeletonView = () => skeleton.head() + body();

export function render(m, state) {
  const p = m.panel('running');
  if (!p.ok) return `<h1>Running</h1><p class="warn">${esc(p.error)}</p>`;
  if (state.running?.error) return `<h1>Running</h1><p class="warn">${esc(state.running.error)}</p>`;
  // The headline is known from the summary already; only the week's detail is still loading.
  if (!state.running || state.running.loading) return `<h1>Running: <mark>${m.glance.doneKm} of ${m.glance.plannedKm} km</mark> this week.</h1>${body()}`;
  const last = m.runs[0];
  const vols = weekly(m.runs), top = Math.max(1, ...vols.map(([, v]) => v));
  return `<h1>Running: <mark>${m.glance.doneKm} of ${m.glance.plannedKm} km</mark> this week.</h1>
    <div class="stats">
      <div><b>${m.runs.length}</b><small>runs in 28 days</small></div>
      <div><b>${Math.round(m.runs.reduce((a, r) => a + r.distance_m, 0) / 1000)} km</b><small>in 28 days</small></div>
      <div><b>${last ? pace(last) : '–'}</b><small>last pace /km</small></div>
      <div><b>${last ? Math.round(last.avg_hr) : '–'}</b><small>last avg bpm</small></div>
    </div>
    ${section('01', 'This week, plan vs done', `${weekChart(m.days)}<div class="days">${m.days.map((d) =>
      `<div><b>${d.dow}</b><small>${esc(d.kind)}</small><small class="${/too|missed/.test(d.verdict) ? 'warn' : ''}">${esc(d.verdict)}</small></div>`).join('')}</div>`)}
    ${section('02', 'Weekly volume', `<div class="vol panel">${vols.map(([w, v]) =>
      `<div><span>Week of ${w}</span><div class="bar"><i style="width:${(v / top) * 100}%"></i></div><b>${v.toFixed(1)} km</b></div>`).join('')}</div>`)}
    ${section('03', 'Runs', feed(m, ['run']))}`;
}
