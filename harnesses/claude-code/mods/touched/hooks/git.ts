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

// `git status --porcelain=v1 -z -b` and `git diff HEAD --numstat -z` into one summary.
// -z prints names raw (without it git quotes names with spaces or accents) and
// ends each entry with NUL. Paths are relative to the repository root.
export function summarize(root: string, status: string, numstat: string): GitSummary {
  const entries = status.split('\0')
  const head = entries.shift() ?? ''
  const branch = head.startsWith('## ') ? (head.slice(3).split('...')[0] ?? '') : ''
  const changes: GitSummary['changes'] = {}

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as string
    if (entry.length < 4) continue
    changes[`${root}/${entry.slice(3)}`] = { ...stateOf(entry.slice(0, 2)), added: 0, removed: 0 }
    // a rename or copy is followed by its original name as an entry of its own
    if (entry[0] === 'R' || entry[0] === 'C') i++
  }

  const parts = numstat.split('\0')
  for (let i = 0; i < parts.length; i++) {
    const [added, removed, ...rest] = (parts[i] as string).split('\t')
    if (!rest.length) continue
    // a rename has an empty name here, then its old and new names as entries of their own
    const name = rest.join('\t') === '' ? parts[(i += 2)] : rest.join('\t')
    const key = `${root}/${name}`
    // binary files report "-" for both counts
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
