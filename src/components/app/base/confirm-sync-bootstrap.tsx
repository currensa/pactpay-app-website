import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { confirmSync, type ConfirmJob } from '@/lib/confirm-sync'
import { useTranslation } from '@/utils/i18n'
import { useEffect, useState } from 'react'

/**
 * App-root bridge for the confirm-sync manager (src/lib/confirm-sync). On mount it resumes any
 * persisted pending confirmations, then translates manager events into UI: background/success
 * toasts and a modal that asks the user whether to keep retrying once all attempts are exhausted.
 * Mounted once in main.tsx.
 */
export default function ConfirmSyncBootstrap() {
  const { t } = useTranslation()
  // Queue of exhausted jobs awaiting a user decision; the modal shows the first one.
  const [exhausted, setExhausted] = useState<ConfirmJob[]>([])

  useEffect(() => {
    const unsubscribe = confirmSync.subscribe(event => {
      switch (event.kind) {
        case 'background':
          toast({ description: t('confirmSync.backgroundToast', { label: event.job.label }) })
          break
        case 'synced':
          toast({ description: t('confirmSync.syncedToast', { label: event.job.label }) })
          break
        case 'exhausted':
          setExhausted(prev =>
            prev.some(j => j.id === event.job.id) ? prev : [...prev, event.job],
          )
          break
      }
    })
    // Resume after subscribing so an already-exhausted job surfaces the modal immediately.
    confirmSync.resume()
    return unsubscribe
  }, [t])

  const current = exhausted[0]

  const dismiss = (id: string) => setExhausted(prev => prev.filter(j => j.id !== id))

  const handleKeepRetrying = () => {
    if (!current) return
    confirmSync.retry(current.id)
    dismiss(current.id)
  }

  return (
    <Dialog open={Boolean(current)} onOpenChange={open => { if (!open && current) dismiss(current.id) }}>
      <DialogContent disableOutsideClose>
        <DialogHeader>
          <DialogTitle>{t('confirmSync.failedTitle')}</DialogTitle>
          <DialogDescription>
            {t('confirmSync.failedBody', { label: current?.label ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => current && dismiss(current.id)}>
            {t('confirmSync.later')}
          </Button>
          <Button onClick={handleKeepRetrying}>{t('confirmSync.keepRetrying')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
