// Pure: group sessions, PRs and tickets into projects and rank what needs attention.
const DAY = 864e5;
const MAIN = new Set(['', 'main', 'master', 'HEAD']);
const age = (iso, now) => Math.floor((now - Date.parse(iso)) / DAY);

export function build({ sessions = [], prs = [], tickets = [] }, now = Date.now()) {
  const projects = new Map();
  // Tickets name their project loosely ("Kinovember" vs repo "kinovember"), so match by substring.
  const slot = (name) => {
    const k = name.toLowerCase();
    const hit = [...projects.keys()].find((p) => p === k || p.includes(k) || k.includes(p));
    if (hit) return projects.get(hit);
    const p = { name, sessions: [], prs: [], tickets: [] };
    projects.set(k, p);
    return p;
  };
  for (const s of sessions) slot(s.repo.split('/').pop()).sessions.push(s);
  for (const p of prs) slot(p.repo).prs.push(p);
  for (const t of tickets) slot(t.project).tickets.push(t);

  const attention = [];
  const flag = (score, text, project, url) => attention.push({ score, text, project: project.name, url });
  for (const p of projects.values()) {
    for (const pr of p.prs) {
      if (pr.role === 'reviewer') flag(90, `Review requested: ${pr.title}`, p, pr.url);
      else if (age(pr.updatedAt, now) >= 3 && age(pr.updatedAt, now) <= 30) // older ones are abandoned, not urgent
         flag(60, `Your PR has sat ${age(pr.updatedAt, now)}d: ${pr.title}`, p, pr.url);
    }
    for (const t of p.tickets)
      if (t.started && age(t.updatedAt, now) >= 5) flag(50, `${t.id} in progress, untouched ${age(t.updatedAt, now)}d: ${t.title}`, p, t.url);
    for (const s of p.sessions)
      if (!s.prUrl && !MAIN.has(s.branch ?? '') && age(s.updatedAt, now) < 3) flag(40, `Session "${s.title}" has a branch but no PR`, p);
    p.sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    p.latest = [...p.sessions, ...p.prs, ...p.tickets].map((x) => x.updatedAt).sort().pop() ?? '';
  }
  return {
    projects: [...projects.values()].sort((a, b) => b.latest.localeCompare(a.latest)),
    attention: attention.sort((a, b) => b.score - a.score).slice(0, 6),
  };
}
