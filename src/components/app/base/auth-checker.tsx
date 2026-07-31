import PreferencesBootstrap from '@/components/app/base/preferences-bootstrap'
import { Navigate } from 'react-router-dom'

export default function AuthChecker(props: { children: React.ReactNode }) {
  const { children } = props
  const token = localStorage.getItem('token')

  if (!token) return <Navigate to="/welcome" />
  return (
    <>
      <PreferencesBootstrap />
      {children}
    </>
  )
}
