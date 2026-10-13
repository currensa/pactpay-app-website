import apis from '@/apis'
import { useToast } from '@/components/ui/use-toast'
import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import usePreferenceStore from '@/stores/preference'
import { usePublicCopy } from '@/views/public/copy'
import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { clearPersistedAuthSession } from '../components/auth-session'
import LoginForm from '../components/login-form'
import { INVITE_CODE_SESSION_KEY } from '../join-invite'

function hasAdminRole(roles: { role: string }[]) {
  return roles.some(r => r.role !== 'Member')
}
export default function SignInStep() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const { copy } = usePublicCopy()
  const { toast } = useToast()
  const getOrganizations = useOrganizationStore(s => s.getOrganizations)
  const checkPrivacyProfile = useAuthStore(s => s.checkPrivacyProfile)
  const hydrateAfterLogin = usePreferenceStore(s => s.hydrateAfterLogin)

  // 登录成功与自动登录共用的路由逻辑。用 ref 持有最新闭包,供 mount-only 的自动登录 effect 调用,
  // 避免 hydrateAfterLogin 更新 language -> copy 引用变化导致 effect 重复触发。
  const routeAfterAuthRef = useRef<() => Promise<void>>(async () => {})
  routeAfterAuthRef.current = async () => {
    const pendingCode = sessionStorage.getItem(INVITE_CODE_SESSION_KEY)
    if (pendingCode) {
      const { isMember } = await apis.organization.checkInviteCodeMembership(pendingCode)
      if (isMember) {
        sessionStorage.removeItem(INVITE_CODE_SESSION_KEY)
        toast({ title: copy.login.alreadyMemberTitle, description: copy.login.alreadyMemberDescription })
        // fall through to normal org routing below
      } else {
        navigate('/welcome/join-org', { replace: true })
        return
      }
    }

    const orgs = await getOrganizations()

    if (!orgs?.length) {
      navigate('/welcome/identity', { replace: true })
      return
    }

    const adminOrgs = orgs.filter(item => hasAdminRole(item.member.roles))

    if (adminOrgs.length === 0) {
      const submitted = await checkPrivacyProfile()
      if (!submitted) {
        navigate('/welcome/bind-wallet', { replace: true })
      } else {
        navigate('/member/dashboard', { replace: true })
      }
    } else {
      navigate('/welcome/select-org', { replace: true })
    }
  }

  const handleLoginSuccess = async () => {
    setChecking(true)

    try {
      await hydrateAfterLogin()
    } catch {
      // Preference hydration should not block auth flow routing.
    }

    try {
      await routeAfterAuthRef.current()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearPersistedAuthSession()
        useAuthStore.getState().reset()
        useOrganizationStore.getState().reset()
      }
    } finally {
      setChecking(false)
    }
  }

  // 自动登录:进入登录页时若 localStorage 已有 token,跳过表单直接走路由。
  // token 失效时(/welcome 下 401 拦截器不会清 token,见 apis/request.ts),手动清 token 后回落到登录表单。
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    let cancelled = false

    const autoLogin = async () => {
      setChecking(true)
      try {
        await hydrateAfterLogin()
      } catch {
        // Preference hydration should not block auth flow routing.
      }
      try {
        await routeAfterAuthRef.current()
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          clearPersistedAuthSession()
          useAuthStore.getState().reset()
          useOrganizationStore.getState().reset()
        }
        // 其余错误也不强制跳转,回落到登录表单
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    autoLogin()
    return () => {
      cancelled = true
    }
  }, [hydrateAfterLogin])

  if (checking) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
        <p className="text-sm text-[#77777d]">{copy.common.loading}</p>
      </div>
    )
  }

  return <LoginForm onLoginSuccess={handleLoginSuccess} />
}
