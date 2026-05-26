import usePreferenceStore from '@/stores/preference'
import { useEffect } from 'react'

export default function PreferencesBootstrap() {
  const fetchPreferences = usePreferenceStore(s => s.fetchPreferences)

  useEffect(() => {
    fetchPreferences().catch(() => {
      // The request interceptor handles visible API errors.
    })
  }, [fetchPreferences])

  return null
}
