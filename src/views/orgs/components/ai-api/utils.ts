function normalizeErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (Array.isArray(value)) {
    const messages = value
      .map(item => normalizeErrorMessage(item))
      .filter((item): item is string => Boolean(item))
    return messages.length ? messages.join('\n') : null
  }

  if (value && typeof value === 'object') {
    const message = (value as { message?: unknown }).message
    const normalized = normalizeErrorMessage(message)
    if (normalized) return normalized
  }

  return null
}

export function getErrorMessage(error: any, fallback: string) {
  return normalizeErrorMessage(error?.response?.data)
    || normalizeErrorMessage(error?.response?.data?.message)
    || normalizeErrorMessage(error?.message)
    || normalizeErrorMessage(error?.data?.message)
    || fallback
}

export function getModelValue(model: string | Record<string, any>) {
  if (typeof model === 'string') return model
  return model.id || model.value || model.name || model.model || ''
}

export function getModelLabel(model: string | Record<string, any>) {
  if (typeof model === 'string') return model
  return model.name || model.label || model.id || model.value || model.model || 'Unknown model'
}

export function formatDisplayAmount(value: string, symbol?: string | null) {
  if (!value) return symbol ? `0 ${symbol}` : '0'
  return symbol ? `${value} ${symbol}` : value
}
