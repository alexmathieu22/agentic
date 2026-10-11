import { expect, test } from 'claude-code/testing'

import { relative, summarize } from '../hooks/git'
import { icon } from '../hooks/icons'

test('summarize folds status and numstat into one summary', () => {
  const s = summarize('/r', '## feat/x...origin/feat/x\n M a.ts\n?? b.ts\nR  c.ts -> d.ts\n', '3\t1\ta.ts\n-\t-\timg.png\n')
  expect(s.branch).toBe('feat/x')
  expect(s.changes['/r/a.ts']).toMatchObject({ added: 3, removed: 1, isModified: true, isStaged: false })
  expect(s.changes['/r/b.ts']).toMatchObject({ added: 0, removed: 0, isUntracked: true })
  expect(s.changes['/r/d.ts']).toBeDefined()
  expect(s.changes['/r/c.ts']).toBeUndefined()
  expect(s.changes['/r/d.ts']).toMatchObject({ isStaged: true })
  expect(s.added).toBe(3)
})

test('relative strips only the session directory', () => {
  expect(relative('/r', '/r/src/a.ts')).toBe('src/a.ts')
  expect(relative('/r', '/elsewhere/a.ts')).toBe('/elsewhere/a.ts')
})

test('icon is a well-formed svg in the requested color', () => {
  expect(icon('pencil', '#fb923c', 16)).toContain('stroke="#fb923c"')
  expect(icon('dot', '#fff', 10)).toContain('fill="#fff"')
})
