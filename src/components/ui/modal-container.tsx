import { cn } from '@/lib/utils'
import { IconX } from '@tabler/icons-react'

interface ModalContainerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export default function ModalContainer({ open, onClose, children, className }: ModalContainerProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative bg-white rounded-[24px] shadow-[0px_48px_48px_0px_rgba(0,0,0,0.03),0px_12px_26px_0px_rgba(0,0,0,0.04)] p-[24px] w-full max-w-[480px] mx-[16px]',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-[24px] top-[24px] flex h-[24px] w-[24px] items-center justify-center text-[#8d8d93] hover:text-[#1c1c26] transition-colors"
        >
          <IconX className="h-[18px] w-[18px]" />
        </button>
        {children}
      </div>
    </div>
  )
}
