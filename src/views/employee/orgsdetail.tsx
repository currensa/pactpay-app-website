import api from '@/apis'
import { useToast } from '@/components/ui/use-toast'
import { IconPencil } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function EmployeeOrgsDetail() {
  const location = useLocation()
  const { orgId = '', memberId = '' } = location.state || {}
  const { toast } = useToast()

  const [showName, setShowName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [role, setRole] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!orgId) return
    api.organization.getOrganizations().then(list => {
      const found = list.find(item => item.organization.orgId === orgId)
      if (!found) return
      const { member } = found
      setShowName(member.showName || '')
      setAvatarUrl(member.avatarUrl || '')
      setRole(member.roles?.[0]?.role || 'Member')
    }).catch(console.error)
  }, [orgId])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const url = await api.auth.uploadFile(file)
      setAvatarUrl(url)
      await saveProfile(showName, url)
    } catch {
      toast({ description: 'Failed to upload image.', variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function saveProfile(name: string, avatar: string) {
    if (!orgId || !memberId) return
    try {
      setSaving(true)
      await api.organization.updateMemberProfile(orgId, memberId, {
        showName: name || undefined,
        avatarUrl: avatar || undefined,
      })
      toast({ description: 'Profile updated.' })
    } catch {
      toast({ description: 'Failed to update profile.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleNameSave() {
    setShowName(nameInput)
    setEditingName(false)
    await saveProfile(nameInput, avatarUrl)
  }

  function startEditName() {
    setNameInput(showName)
    setEditingName(true)
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">
        Personal Information
      </p>

      <div className="bg-white rounded-[32px] p-[24px] flex gap-[24px] items-start">
        {/* Avatar column */}
        <div className="flex flex-col items-center gap-[12px] shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative h-[108px] w-[108px] rounded-full overflow-hidden bg-[#f5f5f5] group"
            title="Change avatar"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={showName} className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-[36px] font-bold text-[#8d8d93]">
                  {showName?.[0]?.toUpperCase() || '?'}
                </span>
            }
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <IconPencil className="h-[24px] w-[24px] text-white" />
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-[12px] leading-[18px] text-[#1c1c26] hover:text-[#5e85ee] transition-colors"
          >
            {uploading ? 'Uploading...' : 'Change'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Info column */}
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[16px] pb-[24px] border-b border-[rgba(0,0,0,0.12)]">
            {/* Name */}
            <div className="flex flex-col gap-[8px] w-[240px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">Name</p>
              {editingName ? (
                <div className="flex items-center gap-[8px]">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 bg-[#f5f5f5] rounded-[8px] px-[10px] py-[4px] text-[16px] leading-[24px] text-[#1c1c26] outline-none"
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={saving}
                    className="text-[13px] text-[#5e85ee] hover:opacity-80 shrink-0"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-[13px] text-[#8d8d93] hover:text-[#1c1c26] shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-[4px]">
                  <p className="text-[16px] leading-[24px] text-[#1c1c26]">{showName || '—'}</p>
                  <button
                    onClick={startEditName}
                    className="flex items-center text-[#8d8d93] hover:text-[#5e85ee] transition-colors"
                  >
                    <IconPencil className="h-[18px] w-[18px]" />
                  </button>
                </div>
              )}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-[8px] w-[240px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">Role in organization</p>
              <p className="text-[16px] leading-[24px] text-[#1c1c26]">{role || '—'}</p>
            </div>
          </div>

          {/* Leave */}
          <button className="text-[14px] leading-[22px] text-[#d92b2b] hover:opacity-80 transition-opacity text-left">
            Leave organization
          </button>
        </div>
      </div>
    </div>
  )
}
