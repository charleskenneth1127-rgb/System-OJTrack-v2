// Deterministic decorative styling (color + icon) derived from an id/name —
// used for the CodeChum-style class cards and the intern roster avatars, so
// the same class/student always gets the same look without storing it.

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

export const CLASS_CARD_PALETTE = [
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // blue
  { bg: '#FCE7F3', fg: '#BE185D' }, // pink
  { bg: '#FFEDD5', fg: '#C2410C' }, // orange
  { bg: '#DCFCE7', fg: '#15803D' }, // green
  { bg: '#EDE9FE', fg: '#6D28D9' }, // violet
  { bg: '#FEF9C3', fg: '#A16207' }, // yellow
]

export const CLASS_CARD_ICONS = ['🎓', '💻', '📘', '🛠️', '📊', '🧪']

export function classCardStyle(classId: string) {
  const hash = hashString(classId)
  const palette = CLASS_CARD_PALETTE[hash % CLASS_CARD_PALETTE.length]
  const icon = CLASS_CARD_ICONS[hash % CLASS_CARD_ICONS.length]
  return { ...palette, icon }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function avatarColor(seed: string) {
  const hash = hashString(seed)
  return CLASS_CARD_PALETTE[hash % CLASS_CARD_PALETTE.length]
}
