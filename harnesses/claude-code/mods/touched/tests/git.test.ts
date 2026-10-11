import { expect, test } from 'claude-code/testing'

import { relative, summarize } from '../hooks/git'
import { icon } from '../hooks/icons'

test('summarize folds status and numstat into one summary', () => {
  const s = summarize('/r', '## feat/x...origin/feat/x\0 M a.ts\0?? b.ts\0R  d.ts\0c.ts\0', '3\t1\ta.ts\0-\t-\timg.png\0')
  expect(s.branch).toBe('feat/x')
  expect(s.changes['/r/a.ts']).toMatchObject({ added: 3, removed: 1, isModified: true, isStaged: false })
  expect(s.changes['/r/b.ts']).toMatchObject({ added: 0, removed: 0, isUntracked: true })
  expect(s.changes['/r/d.ts']).toMatchObject({ isStaged: true })
  expect(s.changes['/r/c.ts']).toBeUndefined()
  expect(s.added).toBe(3)
})

test('names with spaces, accents and renames are one entry each, unquoted', () => {
  // `git status -z` and `git diff --numstat -z` print the raw name, a rename as new then old
  const s = summarize(
    '/r',
    '## main\0 M my notes.md\0 M café.md\0R  new.ts\0old.ts\0',
    '1\t0\tmy notes.md\0' + '2\t0\tcafé.md\0' + '4\t1\t\0old.ts\0new.ts\0',
  )
  expect(Object.keys(s.changes).sort()).toEqual(['/r/café.md', '/r/my notes.md', '/r/new.ts'])
  expect(s.changes['/r/my notes.md']).toMatchObject({ added: 1, isModified: true })
  expect(s.changes['/r/café.md']).toMatchObject({ added: 2, isModified: true })
  expect(s.changes['/r/new.ts']).toMatchObject({ added: 4, removed: 1, isStaged: true })
})

test('relative strips only the session directory', () => {
  expect(relative('/r', '/r/src/a.ts')).toBe('src/a.ts')
  expect(relative('/r', '/elsewhere/a.ts')).toBe('/elsewhere/a.ts')
})

test('icon is a well-formed svg in the requested color', () => {
  expect(icon('pencil', '#fb923c', 16)).toContain('stroke="#fb923c"')
  expect(icon('dot', '#fff', 10)).toContain('fill="#fff"')
})
