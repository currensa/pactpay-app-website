import { Navigate } from 'react-router-dom'

export default function AuthChecker(props: { children: React.ReactNode }) {
  const { children } = props
  const token = localStorage.getItem('token')

  if (token) return children
  else return <Navigate to="/account/login" />
}
