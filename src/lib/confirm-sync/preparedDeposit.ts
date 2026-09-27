import type { ConfirmJobInput, WithdrawMessage } from './types'
import { GRAVARC_ABI } from '../gravarc/gravarcAbi.ts'
import { decodeEventLog, type Hex } from 'viem'

export type PreparedDeposit = {
  version: 1
  userId: string
  orgId: string
  batchId: string
  caipChainId: string
  depositorAddress: string
  depositLeaf: string
  label: string
  withdrawMessages: WithdrawMessage[]
  encContent?: string
  depositInfo?: string
  txHash?: string
}

const key = (userId: string, orgId: string, batchId: string) =>
  `pactpay:preparedDeposit:${userId}:${orgId}:${batchId}`

export function loadPreparedDeposit(userId: string, orgId: string, batchId: string): PreparedDeposit | null {
  const raw = localStorage.getItem(key(userId, orgId, batchId))
  if (!raw) return null
  const value = JSON.parse(raw) as PreparedDeposit
  if (value.version !== 1 || value.userId !== userId || value.orgId !== orgId || value.batchId !== batchId ||
    !value.depositorAddress || !value.depositLeaf || !Array.isArray(value.withdrawMessages)) {
    throw new Error('Saved deposit recovery data is invalid; do not submit another deposit')
  }
  return value
}

function write(record: PreparedDeposit): void {
  const storageKey = key(record.userId, record.orgId, record.batchId)
  localStorage.setItem(storageKey, JSON.stringify(record))
  if (localStorage.getItem(storageKey) !== JSON.stringify(record)) {
    throw new Error('Could not verify saved deposit recovery data')
  }
}

export function prepareDeposit(record: PreparedDeposit): void {
  if (loadPreparedDeposit(record.userId, record.orgId, record.batchId)) {
    throw new Error('This deposit has pending recovery data; resolve it before submitting again')
  }
  write(record)
}

export function attachDepositHash(record: PreparedDeposit, txHash: string): PreparedDeposit {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error('Enter a valid deposit transaction hash')
  const current = loadPreparedDeposit(record.userId, record.orgId, record.batchId)
  if (!current || current.depositLeaf !== record.depositLeaf) throw new Error('Saved deposit data changed')
  if (current.txHash && current.txHash.toLowerCase() !== txHash.toLowerCase()) {
    throw new Error('A different transaction hash is already attached to this deposit')
  }
  const updated = { ...current, txHash: txHash.toLowerCase() }
  write(updated)
  return updated
}

export function preparedConfirmJob(record: PreparedDeposit): ConfirmJobInput {
  if (!record.txHash) throw new Error('A transaction hash is required to confirm this deposit')
  return {
    type: 'confirm-privacy-deposit',
    orgId: record.orgId,
    batchId: record.batchId,
    depositTxHash: record.txHash,
    withdrawMessages: record.withdrawMessages,
    ...(record.encContent ? { encContent: record.encContent, clientRefundId: `${record.batchId}:${record.txHash}` } : {}),
    ...(record.depositInfo ? { depositInfo: record.depositInfo } : {}),
    label: record.label,
  }
}

export function finishPreparedDeposit(orgId: string, batchId: string, txHash: string): void {
  const userId = localStorage.getItem('userId')
  if (!userId) return
  const record = loadPreparedDeposit(userId, orgId, batchId)
  if (record?.txHash?.toLowerCase() === txHash.toLowerCase()) {
    localStorage.removeItem(key(userId, orgId, batchId))
  }
}

export function discardRejectedDeposit(record: PreparedDeposit): void {
  const current = loadPreparedDeposit(record.userId, record.orgId, record.batchId)
  if (current?.depositLeaf === record.depositLeaf && !current.txHash) {
    localStorage.removeItem(key(record.userId, record.orgId, record.batchId))
  }
}

export function assertPreparedReceipt(
  record: PreparedDeposit,
  vaultAddress: string,
  receipt: { status: string; from: string; logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[] },
): void {
  if (receipt.status !== 'success' || receipt.from.toLowerCase() !== record.depositorAddress.toLowerCase()) {
    throw new Error('Deposit receipt is not a successful transaction from the original depositor')
  }
  const matching = receipt.logs.filter(log => {
    if (log.address.toLowerCase() !== vaultAddress.toLowerCase() || !log.topics.length) return false
    try {
      const decoded = decodeEventLog({ abi: GRAVARC_ABI, data: log.data, topics: log.topics as [Hex, ...Hex[]] })
      return decoded.eventName === 'Deposit' && BigInt(decoded.args.depositLeaf) === BigInt(record.depositLeaf)
    } catch { return false }
  })
  if (matching.length !== 1) throw new Error('Deposit transaction does not match the saved encrypted delivery')
}
