import type { Change, FileState, GitSummary } from '../types'

// The two status columns, X (index) and Y (work tree), as flags. " A" is intent-to-add: not staged content yet.
export function stateOf(xy: string): FileState {
  const [x = ' ', y = ' '] = xy
  return {
    isStaged: x !== ' ' && x !== '?',
    isModified: y === 'M' || y === 'T',
    isUntracked: x === '?' || (x === ' ' && y === 'A'),
    isDeleted: x === 'D' || y === 'D',
  }
}

// `git status --porcelain=v1 -b` and `git diff HEAD --numstat` into one summary.
// Paths in both are relative to the repository root.
export function summarize(root: string, status: string, numstat: string): GitSummary {
  const lines = status.split('\n')
  const branch = lines[0]?.startsWith('## ') ? (lines[0].slice(3).split('...')[0] ?? '') : ''
  const changes: GitSummary['changes'] = {}

  for (const line of lines.slice(1)) {
    if (line.length < 4) continue
    // "R  old -> new": the new name is the one on disk
    const name = line.slice(3).split(' -> ').pop() as string
    changes[`${root}/${name}`] = { ...stateOf(line.slice(0, 2)), added: 0, removed: 0 }
  }
  for (const line of numstat.split('\n')) {
    const [added, removed, ...name] = line.split('\t')
    if (!name.length) continue
    // binary files report "-"
    const key = `${root}/${name.join('\t')}`
    const old = changes[key] ?? { ...stateOf('  '), added: 0, removed: 0 }
    changes[key] = { ...old, added: Number(added) || 0, removed: Number(removed) || 0 } as Change
  }

  const all = Object.values(changes)
  return {
    branch,
    changes,
    added: all.reduce((n, c) => n + c.added, 0),
    removed: all.reduce((n, c) => n + c.removed, 0),
  }
}

export function relative(cwd: string, path: string) {
  return path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path
}
