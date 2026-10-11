// touched: a pane of the files Claude read or edited this session, with git state.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ContextFill, GitSummary, Stats, Touch } from '../types'
import { relative, summarize } from './git'
import { COLOR, GLYPH, icon } from './icons'
import type { IconName } from './icons'
import { Overview } from './variants'

type SvgElement = (props: { source: string; alt: string; width?: number; height?: number }) => unknown

const PANE = 'touched'
const files = atom({ plugin: 'touched', key: 'files' } as const, [] as Touch[])
const git = atom({ plugin: 'touched', key: 'git' } as const, null as GitSummary | null)
const stats = atom({ plugin: 'touched', key: 'stats' } as const, { calls: 0, failed: 0, byTool: {} } as Stats)
const context = atom({ plugin: 'touched', key: 'context' } as const, null as ContextFill | null)
const startedAt = atom({ plugin: 'touched', key: 'startedAt' } as const, 0)
const isOpen = atom({ plugin: 'touched', key: 'isOpen' } as const, true)
const collapsed = atom({ plugin: 'touched', key: 'collapsed' } as const, [] as string[])

async function refreshGit($: EngineInterface) {
  const run = (argv: string[]) => $.process.run(argv)
  const top = await run(['git', 'rev-parse', '--show-toplevel'])
  if (top.exitCode !== 0) return update($, git, () => null)
  const [status, numstat] = await Promise.all([
    run(['git', 'status', '--porcelain=v1', '-z', '-b']),
    run(['git', 'diff', 'HEAD', '--numstat', '-z']),
  ])
  await update($, git, () => summarize(top.stdout.trim(), status.stdout, numstat.stdout))
}

async function touch($: EngineInterface, path: string, kind: 'read' | 'edit') {
  const at = await $.clock.now()
  await update($, files, list => {
    const rest = list.filter(f => f.path !== path)
    const old = list.find(f => f.path === path)
    return [
      { path, isRead: old?.isRead || kind === 'read', isEdited: old?.isEdited || kind === 'edit', at },
      ...rest,
    ]
  })
}

export const register: Register = (on, options) => {
  // macOS: `open -a <app>` finds the editor without relying on the app's PATH.
  const editor = String((options as { editor?: string } | undefined)?.editor ?? 'Visual Studio Code')

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'touched', description: 'Open the pane of files Claude touched' })
    await refreshGit($).catch(() => {})
    const usage = await $.session.usage().catch(() => null)
    if (usage) {
      await update($, context, () => usage.context)
      await update($, startedAt, () => usage.startedAt)
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, context, () => e.context)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined) {
      const hasFailed = ran.isError === true
      await update($, stats, s => ({
        calls: s.calls + 1,
        failed: s.failed + (hasFailed ? 1 : 0),
        byTool: { ...s.byTool, [e.tool]: (s.byTool[e.tool] ?? 0) + 1 },
      }))
    }
    return ran
  })

  on('command.run', { command: 'touched' }, async $ => {
    await refreshGit($).catch(() => {})
    await $.ui.open({ id: PANE, title: 'Touched' })
    return { text: 'Touched pane opened.' }
  })

  for (const [tool, kind] of [['Read', 'read'], ['Edit', 'edit'], ['Write', 'edit']] as const) {
    on('tool.call', { tool }, async ($, e, next) => {
      const ran = await next(e)
      if (ran.deny === undefined && ran.isError !== true) {
        await touch($, e.file_path, kind)
        if (kind === 'edit') await refreshGit($).catch(() => {})
      }
      return ran
    })
  }

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Svg } = $.ui.resolve(e) as ReturnType<typeof $.ui.resolve> & { Svg?: SvgElement }
    const list = await read($, files)
    const summary = await read($, git)
    const cwd = await $.session.cwd()
    const now = await $.clock.now()
    const open = await read($, isOpen)
    const folded = await read($, collapsed)

    // Says what happened either way: a press that seems to do nothing is the worst outcome.
    const openInEditor = async (path: string) => {
      $.ui.toast(`Opening in ${editor}…`)
      try {
        const ran = await $.process.run(['open', '-a', editor, path], { timeoutMs: 10_000 })
        if (ran.exitCode !== 0) $.ui.toast(`${editor}: ${ran.stderr.trim().split('\n')[0] || `exit ${ran.exitCode}`}`)
      } catch (err) {
        $.ui.toast(`Could not run open: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Terminal has no Svg: fall back to a glyph in the same color.
    const Icon = ({ name, color, size = 16 }: { name: IconName; color: string; size?: number }) =>
      Svg ? (
        <Svg source={icon(name, color, size)} alt={name} width={size} height={size} />
      ) : (
        <Text color={color}>{GLYPH[name]}</Text>
      )

    return (
      <Box flexDirection="column" gap={1}>
        <Overview
          ui={{ Box, Text, Button, Icon, Svg }}
          list={list}
          git={summary}
          cwd={cwd}
          now={now}
          stats={await read($, stats)}
          context={await read($, context)}
          startedAt={await read($, startedAt)}
          isOpen={open}
          collapsed={folded}
          onOpen={path => void openInEditor(path)}
          onToggleDir={id => void update($, collapsed, list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))}
          onCollapseAll={ids => void update($, collapsed, () => ids)}
          onExpandAll={() => void update($, collapsed, () => [])}
          toggle={
            <Button key="toggle" plain onPress={() => void update($, isOpen, o => !o)}>
              <Text bold>{open ? '▾' : '▸'} Claude touched</Text> <Text dimColor>{list.length} {list.length === 1 ? 'file' : 'files'}</Text>
            </Button>
          }
        />
        <Box flexDirection="row" gap={1}>
          <Button key="ide" label={`Open in ${editor}`} hotkey="o" onPress={() => void openInEditor(cwd)} />
          <Button key="refresh" label="Refresh" hotkey="r" onPress={() => void refreshGit($)} />
          <Button key="close" label="Close" hotkey="q" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
