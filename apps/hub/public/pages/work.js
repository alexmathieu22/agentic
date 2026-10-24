import { esc, rel, section, feed, sessionActions, skeleton, getJSON, mentionsTicket } from '../lib.js';

// Standing instructions for every session started from the board. They repeat what the global setup
// already says, so the session behaves the same on a machine where that setup isn't loaded.
const STARTUP = `Before changing anything:
- If the ticket is vague or has more than one reading, run /grill-me first and settle the plan with me. Skip it when the task is clear.
- Follow my git conventions: load the git-workflow skill before the first edit; work on a branch or worktree, never the default branch; use Conventional Commits and atomic commits; show me the commits before committing; and don't push or open a pull request unless I ask.`;

const TRACKERS = { linear: 'Linear', github: 'GitHub', jira: 'Jira' };
const boardSkeleton = (cols) => cols.map((c, i) => `<div class="col"><h3>${esc(c)}</h3>${skeleton.box('sk-card').repeat(Math.max(1, 3 - i))}</div>`).join('');
export const skeletonView = () => `${skeleton.line('180px')}
  <div class="pick">${'<div class="sk sk-pill"></div>'.repeat(5)}</div><div class="sk sk-h1"></div>
  ${section('', 'Activity', `<div class="panel">${skeleton.line('30%')}${skeleton.line().repeat(6)}</div>`)}`;

// Work = AI sessions plus the tickets they serve. "All" is the cross-project activity feed; a project shows
// its board and its own activity. A project's tracker is Linear when Linear has tickets for it, Jira on the
// job side, else the repo's GitHub issues (loaded on demand).
export function render(m, state, redraw) {
  const job = state.ctx === 'job';
  // A project's tracker as configured (hub.json "trackers"), else guessed: Linear tickets mean Linear.
  const trackerOf = (p) => TRACKERS[m.c.trackers[p.name.toLowerCase()]] ?? (job ? 'Jira' : p.tickets.length ? 'Linear' : 'GitHub');
  const projects = m.c.projects.filter((p) => p.sessions.length || p.tickets.length)
    .map((p) => ({ name: p.name, repo: p.sessions[0]?.repo, tracker: trackerOf(p) }));
  const picker = (current) => `<div class="pick"><button data-work="All" class="${current === 'All' ? 'on' : ''}">All</button>${projects.map((p) =>
    `<button data-work="${esc(p.name)}" class="${p.name === current ? 'on' : ''}">${esc(p.name)}<small>${p.tracker}</small></button>`).join('')}</div>`;
  if (!projects.length || state.work === 'All' || !state.work) {
    state.work = 'All';
    return `${picker('All')}<h1>All work: <mark>${m.sessions.length}</mark> sessions in two weeks, <mark>${m.noPr}</mark> recent branch${m.noPr === 1 ? '' : 'es'} without a PR.</h1>
      ${section('01', 'Activity', feed(m, ['session', 'pr', 'ticket']))}`;
  }
  const cur = projects.find((p) => p.name === state.work) ?? projects[0];
  state.work = cur.name;

  let tickets, loaded = state.issues[cur.name];
  if (cur.tracker === 'GitHub') {
    if (!loaded) {
      state.issues[cur.name] = loaded = { loading: true };
      getJSON(`/api/issues?project=${encodeURIComponent(cur.name)}`).then((d) => { state.issues[cur.name] = d; redraw(); });
    }
    tickets = (loaded.issues ?? []).map((i) => ({ ...i, project: cur.name }));
  } else tickets = m.tickets.filter((t) => t.project.toLowerCase() === cur.name.toLowerCase());

  const projSessions = m.sessions.filter((s) => s.project === cur.name);
  const projPrs = m.prs.filter((p) => p.project === cur.name);
  const linked = (t) => ({
    sessions: projSessions.filter((s) => mentionsTicket(t.id, s.branch) || mentionsTicket(t.id, s.title)),
    prs: projPrs.filter((p) => mentionsTicket(t.id, p.title)),
  });
  // GitHub issues have no workflow states, so their column comes from the work already linked to them.
  const column = (t) => t.state ?? (linked(t).prs.length ? 'In Review' : linked(t).sessions.length ? 'In Progress' : 'Todo');
  const start = (t) => {
    const q = encodeURIComponent(`Pick up ${t.id}: ${t.title}\n${t.url}\n\n${STARTUP}`);
    const folder = cur.repo ? `&folder=${encodeURIComponent(cur.repo)}` : '';
    return `<a class="btn" href="claude://code/new?q=${q}${folder}" title="New Claude Desktop session, ticket pre-filled as the prompt">Start in Claude</a>`;
  };
  const card = (t) => {
    const l = linked(t);
    return `<div class="tk"><div class="tk-h"><a href="${esc(t.url)}" target="_blank" rel="noreferrer">${esc(t.id)}</a><small>${rel(t.updatedAt)}</small></div>
      <b>${esc(t.title)}</b>${t.labels?.length ? `<div class="lbls">${t.labels.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${l.prs.map((p) => `<a class="ln" href="${esc(p.url)}" target="_blank" rel="noreferrer">PR #${p.number}${p.draft ? ' (draft)' : ''}</a>`).join('')}
      ${l.sessions.slice(0, 3).map((s) => `<div class="ln"><span>${esc(s.title)}<small>${rel(s.updatedAt)}</small></span>${sessionActions(s)}</div>`).join('')}
      <div class="tk-f">${start(t)}${l.sessions.length > 3 ? `<small>+${l.sessions.length - 3} more sessions</small>` : ''}</div></div>`;
  };

  const note = loaded?.error ? `<p class="warn">Couldn't load issues: ${esc(loaded.error)}</p>`
    : m.c.sources[cur.tracker.toLowerCase()]?.ok === false ? `<p class="muted">${cur.tracker} isn't connected yet.</p>` : '';
  const noun = cur.tracker === 'GitHub' ? 'issue' : 'ticket';
  const cols = [...new Set(['Todo', ...tickets.map(column), 'In Progress', 'In Review'])];
  const projTickets = m.tickets.filter((t) => t.project === cur.name);
  return `${picker(cur.name)}
    <h1>${esc(cur.name)}: <mark>${loaded?.loading ? '…' : tickets.length}</mark> open ${noun}${tickets.length === 1 ? '' : 's'} in ${cur.tracker}${loaded?.slug ? ` <small class="muted">${esc(loaded.slug)}</small>` : ''}.</h1>${note}
    <div class="board">${loaded?.loading ? boardSkeleton(cols) : cols.map((c) => {
      const ts = tickets.filter((t) => column(t) === c);
      return `<div class="col"><h3>${esc(c)} <span>${ts.length}</span></h3>${ts.map(card).join('') || '<p class="muted">—</p>'}</div>`;
    }).join('')}</div>
    ${section('', 'Activity', feed({ ...m, sessions: projSessions, prs: projPrs, tickets: projTickets }, ['session', 'pr', 'ticket'], 30))}`;
}
