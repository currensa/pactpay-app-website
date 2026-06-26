import { STORAGE_KEY, type ConfirmJob } from './types'

// localStorage-backed persistence for the confirm queue. A job is written when enqueued and
// updated after every attempt; it is removed ONLY by `removeJob`, which the manager calls
// solely on a successful sync. Unsynced jobs therefore survive failures and browser restarts.

export function loadJobs(): ConfirmJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ConfirmJob[]) : []
  } catch {
    // Corrupt/legacy value — start clean rather than crash the app on boot.
    return []
  }
}

export function saveJobs(jobs: ConfirmJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
  } catch {
    // Quota or serialization failure — nothing actionable; the in-memory retry loop continues.
  }
}

export function upsertJob(job: ConfirmJob): void {
  const jobs = loadJobs()
  const idx = jobs.findIndex(j => j.id === job.id)
  if (idx >= 0) jobs[idx] = job
  else jobs.push(job)
  saveJobs(jobs)
}

/** The only deletion path — called exclusively after a confirm succeeds. */
export function removeJob(id: string): void {
  saveJobs(loadJobs().filter(j => j.id !== id))
}
