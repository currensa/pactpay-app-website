import { DEFAULT_LANGUAGE, messages, type I18nKey } from '@/i18n/messages'
import usePreferenceStore from '@/stores/preference'
import type { PreferenceLanguage } from '@/apis/preference.api'
import { useCallback } from 'react'

type Params = Record<string, string | number>

function resolveMessage(source: unknown, key: string): string | undefined {
  let current = source
  for (const segment of key.split('.')) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return typeof current === 'string' ? current : undefined
}

function formatMessage(message: string, params?: Params) {
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
}

export function translate(language: PreferenceLanguage, key: I18nKey, params?: Params) {
  const text = resolveMessage(messages[language], key) ?? resolveMessage(messages[DEFAULT_LANGUAGE], key) ?? key
  return formatMessage(text, params)
}

export function t(key: I18nKey, params?: Params) {
  return translate(usePreferenceStore.getState().language, key, params)
}

export function useTranslation() {
  const language = usePreferenceStore(s => s.language)
  const translateCurrent = useCallback((key: I18nKey, params?: Params) => translate(language, key, params), [language])

  return {
    language,
    t: translateCurrent,
  }
}
