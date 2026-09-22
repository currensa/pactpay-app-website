import type { OrganizationMember } from '@/apis/orgnization.api'
import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import { usePublicCopy } from '@/views/public/copy'
import { IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectOrganization from '../components/select-organization'

export default function SelectOrgStep() {
  const navigate = useNavigate()
  const setCurrentOrg = useOrganizationStore(s => s.setCurrentOrg)
  const checkPrivacyProfile = useAuthStore(s => s.checkPrivacyProfile)
  const { copy } = usePublicCopy()
  const [checking, setChecking] = useState(false)

  const enterMemberSide = async () => {
    setChecking(true)
    const submitted = await checkPrivacyProfile()
    if (!submitted) {
      navigate('/welcome/bind-wallet', { replace: true })
    } else {
      navigate('/member/dashboard', { replace: true })
    }
    setChecking(false)
  }

  const handleSelectAdminOrg = (orgId: string, member: OrganizationMember) => {
    setCurrentOrg(orgId, member)
    navigate('/orgs/dashboard', { replace: true })
  }

  if (checking) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
        <p className="text-sm text-[#77777d]">{copy.common.loading}</p>
      </div>
    )
  }

  return (
    <SelectOrganization
      onCreateNew={() => navigate('/welcome/create-org')}
      onEnterAsMember={enterMemberSide}
      onSelectAdminOrg={handleSelectAdminOrg}
    />
  )
}
