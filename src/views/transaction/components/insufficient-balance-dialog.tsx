import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { IconAlertTriangle } from '@tabler/icons-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

interface InsufficientBalanceDialogProps {
  open: boolean
  onClose: () => void
  currentBalance: number
  requiredAmount: number
  currency: string
  walletAddress: string
  executionDate: string
}

export function InsufficientBalanceDialog({
  open,
  onClose,
  currentBalance,
  requiredAmount,
  currency,
  walletAddress,
  executionDate
}: InsufficientBalanceDialogProps) {
  const shortfall = requiredAmount - currentBalance
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copyButtonText, setCopyButtonText] = useState('Copy')

  useEffect(() => {
    if (open && walletAddress) {
      QRCode.toDataURL(walletAddress, { width: 180, margin: 1 })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: any) => console.error('Failed to generate QR code:', err))
    }
  }, [open, walletAddress])

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopyButtonText('Copied!')
    setTimeout(() => setCopyButtonText('Copy'), 2000)
  }

  const handleCopyAndClose = () => {
    handleCopyAddress()
    setTimeout(() => onClose(), 500)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[99vh] overflow-hidden">
        <div className="space-y-3">
          {/* Warning Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100">
              <IconAlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">Insufficient Balance</h2>
              <p className="text-sm text-gray-600">
                Your payment wallet does not have enough funds to complete this transaction
              </p>
            </div>
          </div>

          {/* Balance Comparison Card */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-yellow-900">Current Balance</span>
              <span className="text-lg font-bold text-yellow-900">
                ${currentBalance.toFixed(2)} <span className="text-xs font-normal">{currency}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-yellow-900">Required Amount</span>
              <span className="text-lg font-bold text-yellow-900">
                ${requiredAmount.toFixed(2)} <span className="text-xs font-normal">{currency}</span>
              </span>
            </div>

            <div className="border-t border-yellow-300 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-yellow-900">Shortfall Amount</span>
                <span className="text-lg font-bold text-red-600">
                  ${shortfall.toFixed(2)} <span className="text-xs font-normal">{currency}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <p className="text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold">Important:</span> Ensure balance of{' '}
              <span className="font-semibold">
                ${requiredAmount.toFixed(2)} {currency}
              </span>{' '}
              before <span className="font-semibold">{formatDate(executionDate)}</span> to prevent transaction failures.
            </p>
          </div>

          {/* Payment Wallet Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Payment Wallet Address</label>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <code className="flex-1 text-xs font-mono text-gray-800 break-all">{walletAddress}</code>
              <Button variant="outline" size="sm" onClick={handleCopyAddress} className="shrink-0 h-7 text-xs">
                {copyButtonText}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Wallet QR Code</label>
            <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-3">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Wallet QR Code" className="w-[180px] h-[180px]" />
              ) : (
                <div className="w-[180px] h-[180px] bg-gray-100 animate-pulse rounded" />
              )}
              <p className="text-xs text-gray-500 text-center mt-2">
                Scan to send funds
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>
              I'll Add Funds Later
            </Button>
            <Button size="sm" onClick={handleCopyAndClose}>Copy Address & Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
