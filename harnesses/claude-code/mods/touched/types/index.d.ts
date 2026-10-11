export type Touch = { path: string; isRead: boolean; isEdited: boolean; at: number }
// What `git status` says about one path: the index column and the work-tree column.
export type FileState = { isStaged: boolean; isModified: boolean; isUntracked: boolean; isDeleted: boolean }
export type Change = FileState & { added: number; removed: number }
export type GitSummary = {
  branch: string
  added: number
  removed: number
  // absolute path -> state and lines added and removed; untracked files count as 0/0
  changes: Record<string, Change>
}
export type Stats = { calls: number; failed: number; byTool: Record<string, number> }
export type ContextFill = { tokens?: number; window: number; percent?: number }

declare module 'claude-code' {
  interface PluginState {
    touched: {
      files: Touch[]
      git: GitSummary | null
      stats: Stats
      context: ContextFill | null
      startedAt: number
      isOpen: boolean
      collapsed: string[]
    }
  }
}
