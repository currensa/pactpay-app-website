import apis from '@/apis'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Copy, RefreshCw, Send, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  onBatchImportClick: () => void
  onInvited: () => void
}

export function InviteSection({ onBatchImportClick, onInvited }: Props) {
  const { toast } = useToast()

  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false)
  const [emailInvites, setEmailInvites] = useState('')
  const [pendingInvites, setPendingInvites] = useState<Array<{ email: string }>>([])
  const [sendingInvites, setSendingInvites] = useState(false)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [emailInviteDialogOpen, setEmailInviteDialogOpen] = useState(false)

  useEffect(() => {
    loadInviteCode()
  }, [])

  const loadInviteCode = async () => {
    setInviteCodeLoading(true)
    try {
      const data = await apis.organization.getOrganizationInviteCode()
      setInviteCode(data.code)
      setInviteLink(`${window.location.origin}/join/${data.code}`)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to load invite code.', variant: 'destructive' })
    } finally {
      setInviteCodeLoading(false)
    }
  }

  const handleConfirmRegenerate = async () => {
    try {
      const newCode = await apis.organization.regenerateOrganizationInviteCode()
      setInviteCode(newCode.code)
      setInviteLink(`${window.location.origin}/join/${newCode.code}`)
      setRegenerateDialogOpen(false)
      toast({ title: 'Success', description: 'Organization invitation regenerated successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to regenerate invitation code', variant: 'destructive' })
    }
  }

  const handleSendEmailInvites = () => {
    if (!emailInvites.trim()) {
      toast({ title: 'Error', description: 'Please enter valid email addresses', variant: 'destructive' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emails = emailInvites.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0 || emails.some(e => !emailRegex.test(e))) {
      toast({ title: 'Error', description: 'Please enter valid email addresses', variant: 'destructive' })
      return
    }
    setPendingInvites(emails.map(email => ({ email })))
    setEmailInviteDialogOpen(true)
  }

  const handleConfirmSendInvites = async () => {
    setSendingInvites(true)
    try {
      const results = await Promise.allSettled(pendingInvites.map(({ email }) => apis.organization.sendEmailInvitation({ email })))
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length
      if (successCount > 0) {
        toast({ title: 'Success', description: `Sent to ${successCount} recipient(s)${failCount > 0 ? `, ${failCount} failed` : ''}` })
        setEmailInvites('')
        setEmailInviteDialogOpen(false)
        setPendingInvites([])
        onInvited()
      } else {
        throw new Error('All invitations failed')
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to send invitations.', variant: 'destructive' })
    } finally {
      setSendingInvites(false)
    }
  }

  return (
    <>
      <div className="bg-[#f5f5f5] rounded-[20px] px-[20px] pt-[16px] pb-[20px] flex flex-col gap-[16px] shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[24px] text-[#1c1c26]">Invite Members</p>
          <button
            onClick={onBatchImportClick}
            className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#ebebeb] transition-colors"
          >
            <Upload className="h-[14px] w-[14px]" />
            Batch Import
          </button>
        </div>

        {/* Two-column cards */}
        <div className="flex gap-[20px]">
          {/* Organization Invitation */}
          <div className="flex flex-1 flex-col gap-[12px] rounded-[16px] border-[0.5px] border-[rgba(0,0,0,0.1)] bg-white p-[16px]">
            <div className="flex flex-col gap-[6px]">
              <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Invitation</p>
              <p className="text-[10px] leading-[18px] text-[#8d8d93]">Members can join the organisation automatically by signing up via an invite link, or by entering an invite code during registration.</p>
              <div className="flex flex-col gap-[6px] rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px]">
                {inviteCodeLoading ? (
                  <p className="text-[13px] leading-[20px] text-[#8d8d93]">Loading...</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="flex-1 truncate text-[13px] leading-[20px] text-[#1c1c26]">{inviteCode}</p>
                      <button onClick={() => { navigator.clipboard.writeText(inviteCode); toast({ description: 'Invite code copied.' }) }} className="ml-[8px] text-[#8d8d93] hover:text-[#1c1c26] transition-colors shrink-0">
                        <Copy className="h-[16px] w-[16px]" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="flex-1 truncate text-[13px] leading-[20px] text-[#1c1c26]">{inviteLink}</p>
                      <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ description: 'Invite link copied.' }) }} className="ml-[8px] text-[#8d8d93] hover:text-[#1c1c26] transition-colors shrink-0">
                        <Copy className="h-[16px] w-[16px]" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setRegenerateDialogOpen(true)}
              className="flex w-fit items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#ebebeb] transition-colors"
            >
              <RefreshCw className="h-[14px] w-[14px]" />
              Deactivate and Regenerate
            </button>
          </div>

          {/* Email Invitation */}
          <div className="flex flex-1 flex-col gap-[12px] rounded-[16px] border-[0.5px] border-[rgba(0,0,0,0.1)] bg-white p-[16px]">
            <div className="flex flex-1 flex-col gap-[6px]">
              <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Email Invitation</p>
              <textarea
                value={emailInvites}
                onChange={e => setEmailInvites(e.target.value)}
                placeholder="Enter emails (comma-separated)"
                rows={2}
                className="w-full flex-1 resize-none rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
              />
            </div>
            <button
              onClick={handleSendEmailInvites}
              className="flex w-fit items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity"
            >
              <Send className="h-[14px] w-[14px]" />
              Send Email
            </button>
          </div>
        </div>
      </div>

      {/* Regenerate dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate and Regenerate Invitation</DialogTitle>
            <DialogDescription>
              Are you sure? The current invite code and link will be deactivated immediately and a new one will be generated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRegenerate}>Deactivate and Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email invite confirm dialog */}
      <Dialog open={emailInviteDialogOpen} onOpenChange={open => { if (!sendingInvites) { setEmailInviteDialogOpen(open); if (!open) setPendingInvites([]) } }}>
        <DialogContent className="max-w-[440px] p-[20px] gap-0 flex flex-col gap-[16px]">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[15px] font-semibold leading-[22px] text-[#1c1c26]">Send Email Invitations</DialogTitle>
          </DialogHeader>

          {sendingInvites ? (
            <div className="flex items-center justify-center gap-[10px] h-[80px] rounded-[10px] bg-[#f5f5f5]">
              <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#5e85ee] border-t-transparent" />
              <p className="text-[13px] leading-[20px] text-[#8d8d93]">Sending invitations...</p>
            </div>
          ) : (
            <div className="rounded-[10px] border border-[rgba(0,0,0,0.10)] overflow-hidden">
              <div className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.08)]">
                <div className="px-[12px] py-[5px] text-[11px] leading-[16px] text-[#8d8d93]">Email</div>
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {pendingInvites.map(({ email }, i) => (
                  <div key={i} className="border-b border-[rgba(0,0,0,0.06)] last:border-b-0">
                    <div className="px-[12px] py-[8px] text-[13px] leading-[20px] text-[#606067] truncate">{email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-[8px]">
            <button
              onClick={() => { setEmailInviteDialogOpen(false); setPendingInvites([]) }}
              disabled={sendingInvites}
              className="rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSendInvites}
              disabled={sendingInvites}
              className="rounded-[10px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              Send Invitations
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
