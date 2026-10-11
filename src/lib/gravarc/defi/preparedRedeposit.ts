import type { WithdrawMessage } from '@/apis/transaction.api'
import { GRAVARC_ABI } from '../gravarcAbi.ts'
import { naclEncrypt } from '../naclCrypto.ts'
import type { DepositProofResult, ReceiverInput } from '@/lib/gravarc/depositProofBrowser'
import { decodeEventLog, type Hex } from 'viem'

export interface PreparedRedeposit {
  id: string
  version: 1
  caipChainId: string
  sender: string
  depositLeaf: string
  txHash?: string
  withdrawMessages: WithdrawMessage[]
}

const storageKey = (sender: string) => `pactpay:preparedRedeposits:${sender.toLowerCase()}`

export function loadPreparedRedeposits(sender: string): PreparedRedeposit[] {
  const raw = localStorage.getItem(storageKey(sender))
  if (!raw) return []
  const records = JSON.parse(raw) as PreparedRedeposit[]
  if (
    !Array.isArray(records) ||
    records.some(
      record =>
        record.version !== 1 ||
        record.sender.toLowerCase() !== sender.toLowerCase() ||
        !record.depositLeaf ||
        !Array.isArray(record.withdrawMessages)
    )
  ) {
    throw new Error('Saved DeFi deposit recovery data is invalid; do not submit another re-deposit')
  }
  return records
}

function save(record: PreparedRedeposit): void {
  const records = loadPreparedRedeposits(record.sender).filter(existing => existing.id !== record.id)
  records.push(record)
  const serialized = JSON.stringify(records)
  localStorage.setItem(storageKey(record.sender), serialized)
  if (localStorage.getItem(storageKey(record.sender)) !== serialized) {
    throw new Error('Could not verify saved encrypted re-deposit delivery')
  }
}

export function prepareRedeposit(
  sender: string,
  caipChainId: string,
  proof: DepositProofResult,
  receivers: ReceiverInput[]
): PreparedRedeposit {
  if (proof.canRefund || proof.receivers.length !== receivers.length) {
    throw new Error('Private re-deposit requires one non-refundable message per receiver')
  }
  const id = `defi:${crypto.randomUUID()}`
  const withdrawMessages: WithdrawMessage[] = proof.receivers.map((receiver, index) => {
    if (receiver.address.toLowerCase() !== receivers[index].address.toLowerCase()) {
      throw new Error('Encrypted receiver order differs from the deposit proof')
    }
    const payload = {
      nullifier: receiver.nullifier,
      amount: receiver.amount,
      leafIndex: proof.leafIndex,
      authRoot: proof.authRoot,
      depositorSecretHash: proof.depositorSecretHash,
      depositPathElements: proof.depositPathElements,
      depositPathIndices: proof.depositPathIndices,
      authPathElements: receiver.authPathElements,
      authPathIndices: receiver.authPathIndices
    }
    return {
      clientMessageId: `${id}:${index}`,
      address: receiver.address,
      content: naclEncrypt(JSON.stringify(payload), receiver.encPubkey),
      secretHash: receivers[index].secretHash,
      encPubkey: receiver.encPubkey.replace(/^0x/, '')
    }
  })
  const record: PreparedRedeposit = {
    id,
    version: 1,
    caipChainId,
    sender,
    depositLeaf: proof.depositLeaf,
    withdrawMessages
  }
  save(record)
  return record
}

export function attachRedepositHash(record: PreparedRedeposit, hash: string): PreparedRedeposit {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('Enter a valid DeFi transaction hash')
  const saved = loadPreparedRedeposits(record.sender).find(candidate => candidate.id === record.id)
  if (!saved || saved.depositLeaf !== record.depositLeaf || saved.caipChainId !== record.caipChainId) {
    throw new Error('Saved encrypted delivery changed')
  }
  if (saved.txHash && saved.txHash.toLowerCase() !== hash.toLowerCase()) {
    throw new Error('A different transaction is already attached')
  }
  const updated = { ...saved, txHash: hash.toLowerCase() }
  save(updated)
  return updated
}

/** Only after an explicit wallet rejection, when no transaction hash can exist. */
export function discardRejectedRedeposit(record: PreparedRedeposit): void {
  const current = loadPreparedRedeposits(record.sender).find(candidate => candidate.id === record.id)
  if (!current || current.txHash) return
  const remaining = loadPreparedRedeposits(record.sender).filter(candidate => candidate.id !== record.id)
  if (remaining.length) localStorage.setItem(storageKey(record.sender), JSON.stringify(remaining))
  else localStorage.removeItem(storageKey(record.sender))
}

export function assertRedepositReceipt(
  record: PreparedRedeposit,
  receipt: {
    status: string
    from: string
    to: string | null
    logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[]
  },
  gravArc: string,
  defiRouter: string
): number {
  if (
    !record.txHash ||
    receipt.status !== 'success' ||
    receipt.from.toLowerCase() !== record.sender.toLowerCase() ||
    receipt.to?.toLowerCase() !== defiRouter.toLowerCase()
  ) {
    throw new Error('The DeFi transaction does not match saved encrypted delivery')
  }
  const matching = receipt.logs.flatMap(log => {
    if (log.address.toLowerCase() !== gravArc.toLowerCase() || !log.topics.length) return []
    try {
      const decoded = decodeEventLog({ abi: GRAVARC_ABI, data: log.data, topics: log.topics as [Hex, ...Hex[]] })
      return decoded.eventName === 'Deposit' && BigInt(decoded.args.depositLeaf) === BigInt(record.depositLeaf)
        ? [Number(decoded.args.leafIndex)]
        : []
    } catch {
      return []
    }
  })
  if (matching.length !== 1) throw new Error('No unique matching GravArc deposit appears in the DeFi receipt')
  return matching[0]
}

export async function deliverRedeposit(record: PreparedRedeposit, leafIndex: number): Promise<void> {
  if (!record.txHash) throw new Error('Attach the confirmed DeFi transaction hash first')
  const { default: apis } = await import('@/apis')
  await apis.transaction.confirmDefiDeposit({
    submission: 'direct',
    caipChainId: record.caipChainId,
    txHash: record.txHash,
    leafIndex,
    depositLeaf: record.depositLeaf,
    withdrawMessages: record.withdrawMessages
  })
  const remaining = loadPreparedRedeposits(record.sender).filter(candidate => candidate.id !== record.id)
  if (remaining.length) localStorage.setItem(storageKey(record.sender), JSON.stringify(remaining))
  else localStorage.removeItem(storageKey(record.sender))
}

/** A wallet receipt precedes the scanner's confirmation-depth/indexing checkpoint. */
export async function waitForIndexedDelivery(
  deliver: () => Promise<void>,
  onWaiting: () => void,
  retryDelayMs = 5_000,
  maxAttempts = 60
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await deliver()
      return
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response
      if (
        response?.status !== 409 ||
        response.data?.message !== 'DeFi re-deposit is not indexed yet; retry delivery' ||
        attempt === maxAttempts - 1
      )
        throw error
      onWaiting()
      await new Promise(resolve => setTimeout(resolve, retryDelayMs))
    }
  }
}
