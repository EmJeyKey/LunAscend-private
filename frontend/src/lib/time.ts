export function toUtc(input: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return null
  const date = new Date(`${input}:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== input) return null
  return date.toISOString().replace('.000Z', 'Z')
}

export function shiftHours(utc: string, hours: number) {
  return new Date(new Date(utc).getTime() + hours * 3600000).toISOString().replace('.000Z', 'Z')
}

export function formatUtc(utc: string, compact = false) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', day: '2-digit', month: 'short',
    ...(compact ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(utc)).replace(',', '')
}

export function formatCoordinate(value: number, latitude: boolean) {
  const direction = latitude ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'E')
  return `${Math.abs(value).toFixed(4)}° ${direction}`
}
