// Stroke icons (24px grid, Lucide-style paths), drawn as an Svg on surfaces that have one.
// Fixed mid-tone colors: an Svg is an image, so it cannot follow the theme.
export type IconName = 'pencil' | 'eye' | 'file' | 'branch' | 'folder' | 'folderOpen' | 'commit' | 'sparkles' | 'chevron' | 'wrench' | 'clock' | 'layers' | 'dot'

export const COLOR = {
  read: '#a78bfa',
  edited: '#fb923c',
  uncommitted: '#fbbf24',
  branch: '#9ca3af',
  add: '#34d399',
  del: '#f87171',
  track: '#4b5563',
}

export const GLYPH: Record<IconName, string> = { pencil: '✎', eye: '◉', file: '▪', branch: '⑂', folder: '▸', folderOpen: '▾', commit: '○', sparkles: '✦', chevron: '▾', wrench: '⚒', clock: '◷', layers: '▤', dot: '●' }

const PATH: Record<Exclude<IconName, 'dot'>, string> = {
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  branch: '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  commit: '<circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>',
}

const open = (w: number, h: number, vb: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}"`

export function icon(name: IconName, color: string, size: number) {
  if (name === 'dot') return `${open(size, size, '0 0 24 24')}><circle cx="12" cy="12" r="8" fill="${color}"/></svg>`
  return `${open(size, size, '0 0 24 24')} fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATH[name]}</svg>`
}

// Five squares split green/red by share, like a git host's diff stat.
export function diffBar(added: number, removed: number) {
  const total = added + removed
  const green = total === 0 ? 0 : Math.round((added / total) * 5)
  const squares = Array.from({ length: 5 }, (_, i) => {
    const fill = total === 0 ? COLOR.track : i < green ? COLOR.add : COLOR.del
    return `<rect x="${i * 11}" y="0" width="9" height="9" rx="2" fill="${fill}"/>`
  }).join('')
  return `${open(54, 9, '0 0 54 9')}>${squares}</svg>`
}

// One wide bar: the green share of all changed lines against the red.
export function splitBar(added: number, removed: number, width: number) {
  const total = added + removed
  const g = total === 0 ? 0 : Math.max(added > 0 ? 4 : 0, Math.round((added / total) * width))
  return `${open(width, 8, `0 0 ${width} 8`)}><rect width="${width}" height="8" rx="4" fill="${COLOR.track}"/><rect width="${total === 0 ? 0 : g}" height="8" rx="4" fill="${COLOR.add}"/><rect x="${g}" width="${total === 0 ? 0 : width - g}" height="8" fill="${COLOR.del}"/></svg>`
}

const EXT: Record<string, string> = {
  ts: '#60a5fa', tsx: '#60a5fa', js: '#facc15', json: '#fbbf24', md: '#38bdf8',
  sh: '#4ade80', yml: '#f472b6', yaml: '#f472b6', py: '#34d399',
}
export const extColor = (name: string) => EXT[name.split('.').pop() ?? ''] ?? '#9ca3af'

// A single-color gauge: `percent` of the track filled.
export function meter(percent: number, color: string, width: number) {
  const fill = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * width)
  return `${open(width, 8, `0 0 ${width} 8`)}><rect width="${width}" height="8" rx="4" fill="${COLOR.track}"/><rect width="${fill}" height="8" rx="4" fill="${color}"/></svg>`
}
