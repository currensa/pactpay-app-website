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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative my-auto w-full max-w-[480px] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[20px] bg-white p-[20px] shadow-[0px_48px_48px_0px_rgba(0,0,0,0.03),0px_12px_26px_0px_rgba(0,0,0,0.04)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[24px] sm:p-[24px]',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-[16px] top-[16px] flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-white/90 text-[#8d8d93] transition-colors hover:text-[#1c1c26] sm:right-[24px] sm:top-[24px] sm:h-[24px] sm:w-[24px] sm:rounded-none sm:bg-transparent"
        >
          <IconX className="h-[18px] w-[18px]" />
        </button>
        {children}
      </div>
    </div>
  )
}
