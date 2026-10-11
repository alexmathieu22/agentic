// The three cards of the touched pane (Git, Files, Session) and the file tree.
import type { Change, ContextFill, GitSummary, Stats, Touch } from '../types'
import { relative } from './git'
import { COLOR, diffBar, extColor, meter, splitBar } from './icons'
import type { IconName } from './icons'

type Anything = any // prototype: element constructors are passed in loosely
export type Ctx = {
  ui: { Box: Anything; Text: Anything; Button: Anything; Icon: Anything; Svg?: Anything }
  list: Touch[]
  git: GitSummary | null
  cwd: string
  now: number
  stats: Stats
  context: ContextFill | null
  startedAt: number
  isOpen: boolean
  toggle: unknown // the section header's Button, built where $ is
  collapsed: string[] // folder ids ("a/b") the person folded
  onOpen: (path: string) => void // open a file in the editor
  onToggleDir: (id: string) => void
  onCollapseAll: (ids: string[]) => void
  onExpandAll: () => void
}

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 5 ? 'now' : s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`
}
const split = (cwd: string, path: string) => {
  const rel = relative(cwd, path)
  const i = rel.lastIndexOf('/')
  return { name: rel.slice(i + 1), dir: i >= 0 ? rel.slice(0, i) : '' }
}
const STATE_COLOR = { staged: '#60a5fa', untracked: COLOR.add, modified: COLOR.uncommitted, deleted: COLOR.del }
const badges = (c: Change) =>
  [
    c.isUntracked && (['U', STATE_COLOR.untracked] as const),
    c.isStaged && (['S', STATE_COLOR.staged] as const),
    c.isModified && (['M', STATE_COLOR.modified] as const),
    c.isDeleted && (['D', STATE_COLOR.deleted] as const),
  ].filter(Boolean) as (readonly [string, string])[]
const kindColor = (f: Touch) => (f.isEdited ? COLOR.edited : COLOR.read)

// One discrete card: an accent-colored border, an icon and title row, a right-hand note.
function Card({ ui: { Box, Text, Icon } }: Ctx, p: { icon: IconName; color: string; title?: string; head?: unknown; right?: unknown; children: unknown }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={p.color} paddingX={1} gap={1}>
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Icon name={p.icon} color={p.color} size={16} />
          {p.head ?? <Text bold>{p.title}</Text>}
        </Box>
        {p.right}
      </Box>
      {p.children}
    </Box>
  )
}

type Row = { depth: number; name: string; id?: string; isFolded?: boolean; file?: Touch; count?: number }

// Touched files as an expanded path tree, folders first, flattened into indented rows.
function rows(list: Touch[], cwd: string, collapsed: string[]): { out: Row[]; ids: string[] } {
  type Node = { dirs: Map<string, Node>; files: Touch[]; count: number }
  const root: Node = { dirs: new Map(), files: [], count: 0 }
  for (const f of list) {
    const parts = relative(cwd, f.path).split('/').filter(Boolean)
    let at = root
    for (const part of parts.slice(0, -1)) {
      if (!at.dirs.has(part)) at.dirs.set(part, { dirs: new Map(), files: [], count: 0 })
      at = at.dirs.get(part)!
      at.count++
    }
    at.files.push(f)
  }
  const out: Row[] = []
  const ids: string[] = []
  const walk = (node: Node, depth: number, prefix: string) => {
    for (const [name, child] of [...node.dirs].sort(([a], [b]) => a.localeCompare(b))) {
      const id = prefix + name
      const isFolded = collapsed.includes(id)
      ids.push(id)
      out.push({ depth, name, id, isFolded, count: child.count })
      if (!isFolded) walk(child, depth + 1, `${id}/`)
    }
    for (const f of [...node.files].sort((a, b) => a.path.localeCompare(b.path))) {
      out.push({ depth, name: f.path.slice(f.path.lastIndexOf('/') + 1), file: f })
    }
  }
  walk(root, 0, '')
  return { out, ids }
}

const tokens = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
const short = (tool: string) => tool.split('__').pop() as string

const lines = (a: number, d: number, Text: Anything) => (
  <Text><Text color="success">+{a}</Text> <Text color="error">-{d}</Text></Text>
)

function GitCard(ctx: Ctx) {
  const { ui: { Box, Text, Svg }, git } = ctx
  if (!git) return Card(ctx, { icon: 'branch', color: COLOR.branch, title: 'No git repository', children: <Text dimColor>Nothing to compare against.</Text> })
  const all = Object.values(git.changes)
  const changed = all.length
  const count = (test: (c: Change) => boolean) => all.filter(test).length
  return Card(ctx, {
    icon: 'branch',
    color: COLOR.branch,
    title: git.branch || 'detached',
    right: lines(git.added, git.removed, Text),
    children: (
      <Box flexDirection="column">
        <Text dimColor>{changed} {changed === 1 ? 'file' : 'files'} changed since the last commit</Text>
        {Svg ? <Svg source={splitBar(git.added, git.removed, 280)} alt="added versus removed lines" width={280} height={8} /> : null}
      </Box>
    ),
  })
}

// The file counts and the tree together: how many files, and where.
function FilesCard(ctx: Ctx) {
  const { ui: { Box, Text, Button, Icon, Svg }, list, git, cwd } = ctx
  const { out, ids } = rows(list, cwd, ctx.collapsed)
  const edited = list.filter(f => f.isEdited).length
  const uncommitted = list.filter(f => git?.changes[f.path]).length
  const tile = (icon: IconName, color: string, n: number, label: string) => (
    <Box key={label} flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1} flexGrow={1}>
      <Icon name={icon} color={color} size={18} />
      <Text bold color={color}>{String(n)}</Text>
      <Text dimColor>{label}</Text>
    </Box>
  )
  return Card(ctx, {
    icon: 'sparkles',
    color: COLOR.edited,
    head: ctx.toggle,
    right: ctx.isOpen && ids.length > 0 && (
      <Box flexDirection="row" gap={1}>
        <Button key="collapse-all" plain dimColor hover={{ underline: true, scope: 'collapse-all' }} hotkey="c" onPress={() => ctx.onCollapseAll(ids)}>⊟ Collapse</Button>
        <Button key="expand-all" plain dimColor hover={{ underline: true, scope: 'expand-all' }} hotkey="e" onPress={() => ctx.onExpandAll()}>⊞ Expand</Button>
      </Box>
    ),
    children: (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1}>
          {tile('pencil', COLOR.edited, edited, 'edited')}
          {tile('eye', COLOR.read, list.length - edited, 'read only')}
          {tile('commit', COLOR.uncommitted, uncommitted, 'uncommitted')}
        </Box>
        {ctx.isOpen && list.length === 0 && <Text dimColor>Nothing yet. Files Claude reads or edits land here.</Text>}
        {ctx.isOpen && list.length > 0 && (
          <Box flexDirection="column">
            {out.map((r, i) => {
              const f = r.file
              const c = f ? git?.changes[f.path] : undefined
              return (
                <Box key={`${i}:${r.name}`} flexDirection="row" alignItems="center" justifyContent="space-between" paddingLeft={r.depth * 2}>
                  <Box flexDirection="row" alignItems="center" gap={1} flexShrink={1}>
                    {f ? (
                      <Box flexDirection="row" alignItems="center" gap={1}>
                        <Icon name="file" color={extColor(r.name)} size={14} />
                        <Button key={`open:${f.path}`} plain hover={{ underline: true }} onPress={() => ctx.onOpen(f.path)}><Text bold>{r.name}</Text></Button>
                      </Box>
                    ) : (
                      <Box flexDirection="row" alignItems="center" gap={0}>
                        <Icon name={r.isFolded ? 'folder' : 'folderOpen'} color="#fbbf24" size={14} />
                        <Button key={`dir:${r.id}`} plain hover={{ underline: true }} onPress={() => ctx.onToggleDir(r.id as string)}>
                          {' '}<Text bold>{r.name}</Text> <Text dimColor>{String(r.count)}</Text>
                        </Button>
                      </Box>
                    )}
                  </Box>
                  {f && (
                    <Box flexDirection="row" alignItems="center" gap={1}>
                      {c && c.added + c.removed > 0 && lines(c.added, c.removed, Text)}
                      {c && Svg && c.added + c.removed > 0 ? <Svg source={diffBar(c.added, c.removed)} alt="diff stat" width={54} height={9} /> : null}
                      {c && badges(c).map(([letter, color]) => <Text key={letter} bold color={color}>{letter}</Text>)}
                      <Icon name={f.isEdited ? 'pencil' : 'eye'} color={kindColor(f)} size={14} />
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    ),
  })
}

// Tool calls, failures, time and context fill: the session's own numbers, no model call.
function SessionCard(ctx: Ctx) {
  const { ui: { Box, Text, Icon, Svg }, stats, context, startedAt, now } = ctx
  const top = Object.entries(stats.byTool).sort(([, a], [, b]) => b - a).slice(0, 4)
  const pct = context?.percent
  const color = pct === undefined ? COLOR.branch : pct >= 90 ? COLOR.del : pct >= 75 ? COLOR.uncommitted : COLOR.add
  return Card(ctx, {
    icon: 'wrench',
    color: COLOR.read,
    title: 'Session',
    right: (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Icon name="clock" color={COLOR.branch} size={14} />
        <Text dimColor>{startedAt ? ago(now - startedAt) : '—'}</Text>
      </Box>
    ),
    children: (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text bold>{String(stats.calls)}</Text>
          <Text dimColor>tool calls</Text>
          {stats.failed > 0 && <Text color="error">· {stats.failed} failed</Text>}
        </Box>
        {top.length > 0 && <Text dimColor wrap="truncate">{top.map(([tool, n]) => `${short(tool)} ${n}`).join(' · ')}</Text>}
        {context && (
          <Box flexDirection="column">
            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
              <Box flexDirection="row" alignItems="center" gap={1}>
                <Icon name="layers" color={color} size={14} />
                <Text dimColor>Context</Text>
              </Box>
              <Text>
                <Text bold>{pct === undefined ? '—' : `${pct}%`}</Text>
                <Text dimColor> {context.tokens === undefined ? '' : `${tokens(context.tokens)} / `}{tokens(context.window)}</Text>
              </Text>
            </Box>
            {Svg ? <Svg source={meter(pct ?? 0, color, 280)} alt="context window fill" width={280} height={8} /> : null}
          </Box>
        )}
      </Box>
    ),
  })
}

export function Overview(ctx: Ctx) {
  const { Box } = ctx.ui
  return (
    <Box flexDirection="column" gap={1}>
      {GitCard(ctx)}
      {FilesCard(ctx)}
      {SessionCard(ctx)}
    </Box>
  )
}
