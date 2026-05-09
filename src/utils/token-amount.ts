import { formatUnits, parseUnits } from 'ethers'

export function formatPreviewAmount(value: string | number | null | undefined, maxDecimals: number = 6): string {
  if (value === null || value === undefined || value === '') return '0'
  const raw = String(value).trim()
  if (!raw) return '0'

  const negative = raw.startsWith('-')
  const unsigned = negative ? raw.slice(1) : raw
  const [integerRaw = '0', fractionRaw = ''] = unsigned.split('.')
  const integerPart = (integerRaw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '') || '0')
  const fractionPart = fractionRaw.replace(/[^\d]/g, '').slice(0, maxDecimals).replace(/0+$/, '')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const prefix = negative && (groupedInteger !== '0' || fractionPart) ? '-' : ''

  return `${prefix}${groupedInteger}${fractionPart ? `.${fractionPart}` : ''}`
}

export function normalizeAmountString(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '.') return '0'
  if (trimmed.startsWith('.')) return `0${trimmed}`
  if (trimmed.endsWith('.')) return `${trimmed}0`
  return trimmed
}

export function parseTokenAmount(value: string, decimals: number): bigint | null {
  try {
    return parseUnits(normalizeAmountString(value), decimals)
  } catch {
    return null
  }
}

export function sumTokenAmounts(amounts: string[], decimals: number): string {
  const total = amounts.reduce((sum, amount) => {
    const parsed = parseTokenAmount(amount, decimals)
    return parsed === null ? sum : sum + parsed
  }, 0n)

  return formatUnits(total, decimals)
}

export function addTokenAmounts(a: string, b: string, decimals: number): string {
  const parsedA = parseTokenAmount(a, decimals)
  const parsedB = parseTokenAmount(b, decimals)

  if (parsedA === null || parsedB === null) return '0'
  return formatUnits(parsedA + parsedB, decimals)
}

export function isPositiveTokenAmount(value: string, decimals: number): boolean {
  const parsed = parseTokenAmount(value, decimals)
  return parsed !== null && parsed > 0n
}

export function areTokenAmountsEqual(a: string, b: string, decimals: number): boolean {
  const parsedA = parseTokenAmount(a, decimals)
  const parsedB = parseTokenAmount(b, decimals)

  if (parsedA !== null && parsedB !== null) return parsedA === parsedB
  return normalizeAmountString(a) === normalizeAmountString(b)
}
