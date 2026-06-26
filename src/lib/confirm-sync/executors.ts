import request from '@/apis/request'
import { REQUEST_TIMEOUT_MS, type ConfirmJob } from './types'

// Maps a queued job to its HTTP call. Uses the raw axios instance directly (rather than the
// TransactionApi methods) so that:
//  - the captured `orgId` is used instead of re-reading the active org from localStorage, and
//  - `skipErrorToast` suppresses the global error toast that would otherwise fire on every retry.
// URLs mirror the corresponding methods in src/apis/transaction.api.ts.

// `skipErrorToast` is a custom field read by the response interceptor in request.ts; it is not
// part of AxiosRequestConfig, hence the cast (matching the pattern used in the api classes).
const config = { timeout: REQUEST_TIMEOUT_MS, skipErrorToast: true } as any

export async function executeJob(job: ConfirmJob): Promise<void> {
  switch (job.type) {
    case 'confirm-deposit':
      await request.post(
        `/transaction/${job.orgId}/batches/${job.batchId}/confirm-deposit`,
        { depositTxHash: job.depositTxHash },
        config,
      )
      return
    case 'confirm-privacy-deposit':
      await request.post(
        `/transaction/${job.orgId}/batches/${job.batchId}/confirm-deposit`,
        { depositTxHash: job.depositTxHash, withdrawMessages: job.withdrawMessages },
        config,
      )
      return
    case 'confirm-withdraw':
      await request.post(
        `/transaction/my-payroll-items/${job.itemId}/confirm-withdraw`,
        { txHash: job.txHash },
        config,
      )
      return
  }
}
