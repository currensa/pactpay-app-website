import usePreferenceStore from '@/stores/preference'
import { useEffect } from 'react'

export default function PreferencesBootstrap() {
  const fetchPreferences = usePreferenceStore(s => s.fetchPreferences)
  const initialized = usePreferenceStore(s => s.initialized)

  useEffect(() => {
    if (initialized) return
    fetchPreferences().catch(() => {
      // The request interceptor handles visible API errors.
    })
  }, [fetchPreferences, initialized])

  return null
}
