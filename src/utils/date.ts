/**
 * Format a date string as YYYY/MM/DD using UTC fields.
 */
export function formatUtcDate(dateValue: string | null | undefined): string {
  if (!dateValue) return '--'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return '--'
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * Format a date string as YYYY/MM/DD HH:mm using UTC fields.
 */
export function formatUtcDateTime(dateValue: string | null | undefined): string {
  if (!dateValue) return '--'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return '--'
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

/**
 * Format a date string as YYYY/MM/DD HH:mm using the browser's local timezone.
 */
export function formatLocalDateTime(dateValue: string | null | undefined): string {
  if (!dateValue) return '--'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return '--'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

export type RelativeExecutionDateTone = 'future' | 'today' | 'past' | 'neutral'

const ONE_DAY_MS = 1000 * 60 * 60 * 24

export function getRelativeExecutionDate(dateValue: Date | string | null | undefined): {
  label: string
  tone: RelativeExecutionDateTone
  diffDays: number | null
} {
  if (!dateValue) {
    return { label: '--', tone: 'neutral', diffDays: null }
  }

  const date = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return { label: '--', tone: 'neutral', diffDays: null }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / ONE_DAY_MS)

  if (diffDays > 0) {
    return {
      label: `In ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      tone: 'future',
      diffDays,
    }
  }

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays)
    return {
      label: `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
      tone: 'past',
      diffDays,
    }
  }

  return { label: 'Today', tone: 'today', diffDays }
}

export function getRelativeExecutionDateTextClassName(tone: RelativeExecutionDateTone): string {
  switch (tone) {
    case 'future':
      return 'text-[#3da813]'
    case 'today':
      return 'text-[#c47d00]'
    case 'past':
      return 'text-[#d92b2b]'
    default:
      return 'text-[#1c1c26]'
  }
}
