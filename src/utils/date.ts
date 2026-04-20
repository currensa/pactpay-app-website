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
