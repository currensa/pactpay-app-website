import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { IconAlertCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/use-toast'

interface ChangeEmailDialogProps {
  currentEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newEmail: string) => void
}

export function ChangeEmailDialog({ currentEmail, open, onOpenChange, onSuccess }: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Validation states
  const [emailError, setEmailError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [codeError, setCodeError] = useState('')

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [countdown])

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setNewEmail('')
      setConfirmEmail('')
      setVerificationCode('')
      setEmailError('')
      setConfirmError('')
      setCodeError('')
    }
  }, [open])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format')
      return false
    }
    setEmailError('')
    return true
  }

  const checkEmailAvailability = async (email: string) => {
    // TODO: Implement actual backend check
    // Simulate check
    if (email === 'taken@example.com') {
      setEmailError('This email is already registered. Please use a different email.')
      return false
    }
    return true
  }

  const handleEmailBlur = async () => {
    if (!newEmail) return
    if (validateEmail(newEmail)) {
      await checkEmailAvailability(newEmail)
    }
  }

  const handleSendCode = async () => {
    if (!validateEmail(newEmail)) return
    
    setIsSendingCode(true)
    // TODO: Implement send code logic
    await new Promise(resolve => setTimeout(resolve, 1000))
    setCountdown(60)
    setIsSendingCode(false)
    toast({
      title: "Verification code sent",
      description: "Please check your new email address for the code.",
    })
  }

  const handleUpdate = async () => {
    // Final validation
    let isValid = true
    if (!validateEmail(newEmail)) isValid = false
    
    if (newEmail !== confirmEmail) {
      setConfirmError('Emails do not match')
      isValid = false
    } else {
      setConfirmError('')
    }

    if (verificationCode.length !== 6) {
      setCodeError('Please enter a valid 6-digit code')
      isValid = false
    } else {
      setCodeError('')
    }

    if (!isValid) return

    setIsUpdating(true)
    try {
      // TODO: Implement actual update logic
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onSuccess(newEmail)
      onOpenChange(false)
      toast({
        title: "Email updated successfully",
        description: "Please use the new email to log in next time.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
            <IconAlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
            <p className="text-sm">
              Changing your email will affect your login credentials. Make sure you have access to the new email.
            </p>
          </div>

          <div className="space-y-4">
            {/* Current Email */}
            <div className="space-y-2">
              <Label>Current Email</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {currentEmail}
              </div>
            </div>

            {/* New Email */}
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                placeholder="Enter new email address"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                onBlur={handleEmailBlur}
                className={cn(emailError && "border-destructive")}
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>

            {/* Confirm New Email */}
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirm New Email</Label>
              <Input
                id="confirm-email"
                placeholder="Re-enter new email address"
                value={confirmEmail}
                onChange={(e) => {
                  setConfirmEmail(e.target.value)
                  if (confirmError) setConfirmError('')
                }}
                className={cn(confirmError && "border-destructive")}
              />
              {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
            </div>

            {/* Verification Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => {
                    // Only allow numbers and max 6 chars
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                    setVerificationCode(value)
                    if (codeError) setCodeError('')
                  }}
                  className={cn("flex-1 text-center tracking-widest", codeError && "border-destructive")}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-32 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                  onClick={handleSendCode}
                  disabled={isSendingCode || countdown > 0 || !newEmail || !!emailError}
                >
                  {isSendingCode ? "Sending..." : countdown > 0 ? `${countdown}s` : "Send Code"}
                </Button>
              </div>
              {codeError && <p className="text-xs text-destructive">{codeError}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white min-w-[120px]"
            onClick={handleUpdate}
            disabled={isUpdating || !newEmail || !confirmEmail || !verificationCode || !!emailError || !!confirmError}
          >
            {isUpdating ? "Updating..." : "Update Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

