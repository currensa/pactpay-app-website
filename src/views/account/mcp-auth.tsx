import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LoginForm from './components/login-form'

function readCurrentAuth() {
  return {
    token: localStorage.getItem('token') || '',
    orgId: localStorage.getItem('organizationId') || '',
  }
}

async function sendToken(callbackUrl: string, token: string, orgId?: string) {
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      orgId: orgId || undefined,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to send token to MCP server')
  }
}

export default function McpAuthPage() {
  const [searchParams] = useSearchParams()
  const callback = searchParams.get('callback') || ''
  const [status, setStatus] = useState<'checking' | 'login' | 'submitting' | 'done' | 'error'>('checking')
  const [error, setError] = useState('')

  const hasCallback = useMemo(() => {
    if (!callback) return false
    try {
      const url = new URL(callback)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, [callback])

  useEffect(() => {
    if (!hasCallback) {
      setStatus('error')
      setError('Missing or invalid callback URL.')
      return
    }

    const current = readCurrentAuth()
    if (!current.token) {
      setStatus('login')
      return
    }

    setStatus('submitting')
    void sendToken(callback, current.token, current.orgId)
      .then(() => setStatus('done'))
      .catch(err => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to send token.')
      })
  }, [callback, hasCallback])

  const handleLoginSuccess = async () => {
    if (!hasCallback) {
      setStatus('error')
      setError('Missing or invalid callback URL.')
      return
    }

    const current = readCurrentAuth()
    if (!current.token) {
      setStatus('error')
      setError('Login succeeded but token is missing in local storage.')
      return
    }

    setStatus('submitting')
    try {
      await sendToken(callback, current.token, current.orgId)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to send token.')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[24px] border border-[rgba(0,0,0,0.08)] bg-white p-[32px] text-center">
          <h1 className="text-[28px] font-semibold text-[#1c1c26]">Authentication complete</h1>
          <p className="mt-[12px] text-[15px] leading-[24px] text-[#606067]">
            The token has been sent to the local MCP server. You can return to your MCP client and close this page.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[24px] border border-[rgba(217,43,43,0.2)] bg-white p-[32px] text-center">
          <h1 className="text-[28px] font-semibold text-[#1c1c26]">Authentication failed</h1>
          <p className="mt-[12px] text-[15px] leading-[24px] text-[#d92b2b]">{error || 'Unknown error.'}</p>
        </div>
      </div>
    )
  }

  if (status === 'submitting' || status === 'checking') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[24px] border border-[rgba(0,0,0,0.08)] bg-white p-[32px] text-center">
          <h1 className="text-[28px] font-semibold text-[#1c1c26]">Connecting to MCP server</h1>
          <p className="mt-[12px] text-[15px] leading-[24px] text-[#606067]">
            {status === 'checking' ? 'Checking saved session...' : 'Sending token to local MCP server...'}
          </p>
        </div>
      </div>
    )
  }

  return <LoginForm onLoginSuccess={() => void handleLoginSuccess()} />
}
