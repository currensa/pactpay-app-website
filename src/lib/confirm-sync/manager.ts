import { executeJob } from './executors'
import { loadJobs, removeJob, upsertJob } from './storage'
import {
  INLINE_ATTEMPTS,
  INLINE_RETRY_GAP_MS,
  MAX_ATTEMPTS,
  RETRY_INTERVAL_MS,
  jobTxHash,
  type ConfirmJob,
  type ConfirmJobInput,
  type ConfirmSyncEvent,
  type EnqueueResult,
} from './types'

// Singleton that durably retries backend confirm callbacks. Framework-agnostic (no React) so it
// keeps running across route changes; the React bootstrap (confirm-sync-bootstrap.tsx) only calls
// resume()/subscribe() and renders the resulting toasts + exhaustion modal.

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function errMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { message?: unknown }
    if (typeof anyErr.message === 'string') return anyErr.message
  }
  return String(err)
}

class ConfirmSyncManager {
  /** Job ids with a live retry loop — prevents two loops racing the same job. */
  private readonly processing = new Set<string>()
  private readonly listeners = new Set<(event: ConfirmSyncEvent) => void>()

  subscribe(listener: (event: ConfirmSyncEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: ConfirmSyncEvent): void {
    this.listeners.forEach(listener => listener(event))
  }

  private build(input: ConfirmJobInput): ConfirmJob {
    return {
      ...input,
      id: `${input.type}:${jobTxHash(input)}`,
      attempts: 0,
      status: 'pending',
      createdAt: Date.now(),
    } as ConfirmJob
  }

  /**
   * Persist + start retrying a confirm. The returned promise resolves once the inline phase ends —
   * `'synced'` if confirmed within the first INLINE_ATTEMPTS tries, else `'background'` (retries
   * continue in the background up to MAX_ATTEMPTS). It never rejects: the chain tx already
   * succeeded, so the caller should treat the deposit/withdraw as done regardless.
   */
  enqueue(input: ConfirmJobInput): Promise<EnqueueResult> {
    const job = this.build(input)
    if (this.processing.has(job.id)) return Promise.resolve('background')
    upsertJob(job)
    return new Promise<EnqueueResult>(resolve => {
      let settled = false
      const settle = (result: EnqueueResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }
      void this.runLoop(job, settle, false)
    })
  }

  /** Re-run pending jobs after a browser restart and re-surface any already-exhausted ones. */
  resume(): void {
    for (const job of loadJobs()) {
      if (job.status === 'exhausted') {
        this.emit({ kind: 'exhausted', job })
        continue
      }
      if (this.processing.has(job.id)) continue
      void this.runLoop(job, () => {}, true)
    }
  }

  /** Reset and resume a job — invoked by the exhaustion modal's "keep retrying" action. */
  retry(id: string): void {
    const job = loadJobs().find(j => j.id === id)
    if (!job || this.processing.has(id)) return
    job.attempts = 0
    job.status = 'pending'
    job.lastError = undefined
    upsertJob(job)
    void this.runLoop(job, () => {}, true)
  }

  /**
   * The retry loop. `startBackground` skips the inline phase (used by resume()/retry()), so those
   * jobs go straight to the 30s cadence and emit `synced` on eventual success.
   */
  private async runLoop(
    job: ConfirmJob,
    settle: (result: EnqueueResult) => void,
    startBackground: boolean,
  ): Promise<void> {
    if (this.processing.has(job.id)) return
    this.processing.add(job.id)
    let wentBackground = startBackground
    try {
      while (job.attempts < MAX_ATTEMPTS) {
        try {
          await executeJob(job)
          removeJob(job.id)
          if (wentBackground) this.emit({ kind: 'synced', job })
          settle('synced')
          return
        } catch (err) {
          job.attempts += 1
          job.lastError = errMessage(err)
          const reachedMax = job.attempts >= MAX_ATTEMPTS
          if (reachedMax) job.status = 'exhausted'
          upsertJob(job)

          if (reachedMax) {
            this.emit({ kind: 'exhausted', job })
            settle('background')
            return
          }
          if (!wentBackground && job.attempts >= INLINE_ATTEMPTS) {
            wentBackground = true
            this.emit({ kind: 'background', job })
            settle('background')
          }
          await sleep(wentBackground ? RETRY_INTERVAL_MS : INLINE_RETRY_GAP_MS)
        }
      }
    } finally {
      this.processing.delete(job.id)
    }
  }
}

export const confirmSync = new ConfirmSyncManager()
