import ModalContainer from '@/components/ui/modal-container'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface AddressBookChainOption {
  caipChainId: string
  name: string
  iconUrl: string
  ecosystem: string
}

interface AddressBookDialogValue {
  id: string
  caipChainId: string
  address: string
  remark: string | null
}

interface AddressBookDialogPayload {
  caipChainId: string
  address: string
  remark: string
}

interface AddressBookDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  value?: AddressBookDialogValue | null
  chains: AddressBookChainOption[]
  loading?: boolean
  onClose: () => void
  onSubmit: (payload: AddressBookDialogPayload) => Promise<void>
  validateAddress: (value: { caipChainId: string; address: string }) => string | null
}

interface FormErrors {
  remark?: string
  caipChainId?: string
  address?: string
}

export default function AddressBookDialog({
  open,
  mode,
  value,
  chains,
  loading = false,
  onClose,
  onSubmit,
  validateAddress,
}: AddressBookDialogProps) {
  const [remark, setRemark] = useState('')
  const [caipChainId, setCaipChainId] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    setRemark(value?.remark ?? '')
    setCaipChainId(value?.caipChainId ?? '')
    setAddress(value?.address ?? '')
    setErrors({})
    setChainDropdownOpen(false)
  }, [open, value])

  useEffect(() => {
    if (!open || mode !== 'create' || caipChainId || chains.length === 0) return
    setCaipChainId(chains[0].caipChainId)
  }, [open, mode, caipChainId, chains])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(event.target as Node)) {
        setChainDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedChain = useMemo(
    () => chains.find(chain => chain.caipChainId === caipChainId) ?? null,
    [chains, caipChainId]
  )

  const validate = () => {
    const nextErrors: FormErrors = {}
    const trimmedRemark = remark.trim()
    const trimmedAddress = address.trim()

    if (!trimmedRemark) nextErrors.remark = 'Label is required.'
    if (mode === 'create' && !caipChainId) nextErrors.caipChainId = 'Network is required.'
    if (mode === 'create' && !trimmedAddress) {
      nextErrors.address = 'Address is required.'
    } else if (mode === 'create') {
      const addressError = validateAddress({ caipChainId, address: trimmedAddress })
      if (addressError) nextErrors.address = addressError
    }

    setErrors(nextErrors)
    return { valid: Object.keys(nextErrors).length === 0, trimmedRemark, trimmedAddress }
  }

  const handleSubmit = async () => {
    const { valid, trimmedRemark, trimmedAddress } = validate()
    if (!valid) return

    await onSubmit({
      caipChainId,
      address: trimmedAddress,
      remark: trimmedRemark,
    })
  }

  return (
    <ModalContainer open={open} onClose={() => { if (!loading) onClose() }} className="max-w-[560px]">
      <div className="flex flex-col gap-[24px] pr-[32px]">
        <div className="flex flex-col gap-[8px]">
          <p className="font-bold text-[18px] leading-[28px] text-[#1c1c26]">
            {mode === 'create' ? 'Add address' : 'Edit address'}
          </p>
          <p className="text-[14px] leading-[22px] text-[#606067]">
            {mode === 'create'
              ? 'Save a trusted address for faster account setup and transfers.'
              : 'Update the label for this saved address.'}
          </p>
        </div>

        <div className="flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">Label *</p>
            <input
              value={remark}
              onChange={event => {
                setRemark(event.target.value)
                if (errors.remark) setErrors(prev => ({ ...prev, remark: undefined }))
              }}
              placeholder="e.g. My exchange wallet"
              maxLength={256}
              className="w-full rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
            />
            {errors.remark && <p className="text-[13px] leading-[20px] text-[#d92b2b]">{errors.remark}</p>}
          </div>

          {mode === 'create' ? (
            <>
              <div className="flex flex-col gap-[8px]">
                <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">Network *</p>
                <div className="relative" ref={chainDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setChainDropdownOpen(openState => !openState)}
                    className="w-full rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-left text-[16px] leading-[24px] text-[#1c1c26]"
                  >
                    <div className="flex items-center justify-between gap-[12px]">
                      {selectedChain ? (
                        <div className="flex items-center gap-[8px]">
                          {selectedChain.iconUrl && (
                            <img src={selectedChain.iconUrl} alt={selectedChain.name} className="h-[18px] w-[18px] rounded-full shrink-0" />
                          )}
                          <span>{selectedChain.name}</span>
                        </div>
                      ) : (
                        <span className="text-[#8d8d93]">Select a network</span>
                      )}
                      <ChevronDown className={`h-[16px] w-[16px] shrink-0 text-[#606067] transition-transform ${chainDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {chainDropdownOpen && chains.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-[4px] w-full overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg">
                      {chains.map(chain => (
                        <button
                          key={chain.caipChainId}
                          type="button"
                          onClick={() => {
                            setCaipChainId(chain.caipChainId)
                            setChainDropdownOpen(false)
                            if (errors.caipChainId) setErrors(prev => ({ ...prev, caipChainId: undefined }))
                          }}
                          className="flex w-full items-center justify-between px-[16px] py-[12px] text-left text-[14px] leading-[22px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
                        >
                          <div className="flex items-center gap-[8px]">
                            {chain.iconUrl && (
                              <img src={chain.iconUrl} alt={chain.name} className="h-[18px] w-[18px] rounded-full shrink-0" />
                            )}
                            <span>{chain.name}</span>
                          </div>
                          {caipChainId === chain.caipChainId && <Check className="h-[14px] w-[14px] shrink-0 text-[#5e85ee]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.caipChainId && <p className="text-[13px] leading-[20px] text-[#d92b2b]">{errors.caipChainId}</p>}
              </div>

              <div className="flex flex-col gap-[8px]">
                <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">Address *</p>
                <input
                  value={address}
                  onChange={event => {
                    setAddress(event.target.value)
                    if (errors.address) setErrors(prev => ({ ...prev, address: undefined }))
                  }}
                  placeholder="0x..."
                  maxLength={128}
                  className="w-full rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
                />
                {errors.address && <p className="text-[13px] leading-[20px] text-[#d92b2b]">{errors.address}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-[8px]">
                <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">Network</p>
                <div className="rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26]">
                  <div className="flex items-center gap-[8px]">
                    {selectedChain?.iconUrl && (
                      <img src={selectedChain.iconUrl} alt={selectedChain.name} className="h-[18px] w-[18px] rounded-full shrink-0" />
                    )}
                    <span>{selectedChain?.name ?? value?.caipChainId ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[8px]">
                <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">Address</p>
                <div className="break-all rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26]">
                  {value?.address ?? '-'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-[12px]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[16px] py-[10px] text-[14px] leading-[22px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-[12px] bg-[#5e85ee] px-[16px] py-[10px] text-[14px] leading-[22px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </ModalContainer>
  )
}
