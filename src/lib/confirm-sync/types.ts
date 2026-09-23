// Durable retry/sync of backend "confirm" callbacks for on-chain deposit/withdraw
// transactions. Because the on-chain tx is the source of truth, a failed confirm must
// never surface as a failed deposit/withdraw — instead it is queued and retried (with
// localStorage persistence so it survives a browser restart). See manager.ts.

export const MAX_ATTEMPTS = 10 // total attempts before asking the user whether to keep retrying
export const RETRY_INTERVAL_MS = 30_000 // wait between background attempts
export const INLINE_RETRY_GAP_MS = 2_000 // shorter wait between the inline (caller-awaited) attempts
export const REQUEST_TIMEOUT_MS = 30_000 // per-attempt axios timeout
export const INLINE_ATTEMPTS = 2 // attempts the caller awaits before the job goes background
export const STORAGE_KEY = 'pactpay:pendingConfirmations'

export type ConfirmJobType =
  | 'confirm-deposit'
  | 'confirm-privacy-deposit'
  | 'confirm-withdraw'
  | 'confirm-refund-gravarc'

export type ConfirmJobStatus = 'pending' | 'exhausted'

interface BaseConfirmJob {
  /** `${type}:${txHash}` — stable so the same tx de-dupes instead of queueing twice. */
  id: string
  type: ConfirmJobType
  attempts: number
  status: ConfirmJobStatus
  createdAt: number
  lastError?: string
  /** Human-friendly name (transaction/item) shown in the exhaustion modal + toasts. */
  label: string
}

/** Per-receiver encrypted withdraw message produced by the privacy-deposit flow. */
export interface WithdrawMessage {
  clientMessageId?: string
  address: string
  content: string
  secretHash: string
  encPubkey: string
}

export interface ConfirmDepositJob extends BaseConfirmJob {
  type: 'confirm-deposit'
  /** Captured at enqueue time — the active org can change before the retry runs. */
  orgId: string
  batchId: string
  depositTxHash: string
}

export interface ConfirmPrivacyDepositJob extends BaseConfirmJob {
  type: 'confirm-privacy-deposit'
  orgId: string
  batchId: string
  depositTxHash: string
  withdrawMessages: WithdrawMessage[]
  /** 加密的退款载荷（仅可退款存款携带；便携化：随 confirm 上传存入 GravArcDeposition.encContent） */
  encContent?: string
  /** 退款载荷元信息 JSON { depositorSecretHash, encPubkey } */
  depositInfo?: string
  clientRefundId?: string
}

export interface ConfirmWithdrawJob extends BaseConfirmJob {
  type: 'confirm-withdraw'
  itemId: string
  txHash: string
}

/** 自托付直发 refund 后的链上回执确认（POST confirm-refund-gravarc）。 */
export interface ConfirmRefundGravArcJob extends BaseConfirmJob {
  type: 'confirm-refund-gravarc'
  orgId: string
  batchId: string
  refundTxHash: string
}

export type ConfirmJob =
  | ConfirmDepositJob
  | ConfirmPrivacyDepositJob
  | ConfirmWithdrawJob
  | ConfirmRefundGravArcJob

/** Shape passed to `confirmSync.enqueue` — bookkeeping fields are filled in by the manager. */
export type ConfirmJobInput =
  | Omit<ConfirmDepositJob, 'id' | 'attempts' | 'status' | 'createdAt'>
  | Omit<ConfirmPrivacyDepositJob, 'id' | 'attempts' | 'status' | 'createdAt'>
  | Omit<ConfirmWithdrawJob, 'id' | 'attempts' | 'status' | 'createdAt'>
  | Omit<ConfirmRefundGravArcJob, 'id' | 'attempts' | 'status' | 'createdAt'>

/** Result of the inline (caller-awaited) phase. Never an error — chain already succeeded. */
export type EnqueueResult = 'synced' | 'background'

export type ConfirmSyncEvent =
  | { kind: 'background'; job: ConfirmJob } // exceeded inline attempts, now retrying in background
  | { kind: 'synced'; job: ConfirmJob } // a backgrounded job finally succeeded
  | { kind: 'exhausted'; job: ConfirmJob } // hit MAX_ATTEMPTS, awaiting user decision

/** Returns the txHash a job is confirming — used to build its stable id. */
export function jobTxHash(input: ConfirmJobInput): string {
  if (input.type === 'confirm-withdraw') return input.txHash
  if (input.type === 'confirm-refund-gravarc') return input.refundTxHash
  return input.depositTxHash
}
