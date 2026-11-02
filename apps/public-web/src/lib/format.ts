export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatMonthYear(iso: string): string {
  return formatDate(iso, { month: 'long', year: 'numeric' })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Spread items round-robin so each column differs, repeating to reach `min` items. */
export function fillTo<T>(items: T[], min: number): T[] {
  if (items.length === 0) return []
  const out: T[] = []
  while (out.length < min) out.push(...items)
  return out
}

export function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items
  const n = ((by % items.length) + items.length) % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}
