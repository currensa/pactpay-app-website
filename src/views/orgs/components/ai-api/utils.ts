export function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || error?.data?.message || fallback
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
