import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export const INVITE_CODE_SESSION_KEY = 'pendingInviteCode'

export default function JoinInvite() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (code) {
      sessionStorage.setItem(INVITE_CODE_SESSION_KEY, code)
    }
    navigate('/account/login', { replace: true })
  }, [])

  return null
}
