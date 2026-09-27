import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { GRAVARC_ABI } from '@/lib/gravarc/gravarcAbi'
import { verifyDepositMembershipPath } from '@/lib/gravarc/depositMembershipPath'
import { deriveNaclKeyPair } from '@/lib/gravarc/naclCrypto'
import { naclDecryptWithKeyPair } from '@/lib/gravarc/naclCrypto'
import { verifyClaimStatusEntries, type DepositorStatusPayload } from '@/lib/gravarc/depositorClaimStatus'
import { privateDepositBalances, sameDepositLeaf } from '@/lib/gravarc/privateDepositBalances'
import { loadDepositorPayload } from '@/lib/gravarc/refundPrivacyDeposit'
import { verifyRefundPayloadCommitment } from '@/lib/gravarc/refundPayloadCommitment'
import { computeNullifierHash } from '@/lib/gravarc/withdrawProofBrowser'
import { readRefundableDepositState } from '@/lib/gravarc/refundableDepositState'
import { pacedRpcRead } from '@/lib/gravarc/pacedRpcRead'
import { openWalletModal, selectWalletNetwork } from '@/providers/app-kit-provider'
import { usePrivacyUnlock } from '@/providers/privacy-unlock-provider'
import useChainAssetStore from '@/stores/chain-asset'
import useAuthStore from '@/stores/auth'
import { useTranslation } from '@/utils/i18n'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { formatUnits } from 'ethers'
import { useEffect, useState } from 'react'
import { createPublicClient, createWalletClient, custom, type Hex } from 'viem'

export function PrivateDepositStatus({ plan, symbol, decimals, onRefundVerified }: {
  plan: TransactionPlan; symbol: string; decimals: number; onRefundVerified?: (verified: boolean) => void
}) {
  const { t } = useTranslation()
  const { getChain } = useChainAssetStore()
  const { address } = useAppKitAccount()
  const profileUserId = useAuthStore(state => state.gravArcUserInfo?.userId)
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const { rememberKey, setRememberKey, cachedKeyPair, cacheKeyPair, forgetKeyPair } = usePrivacyUnlock()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [balances, setBalances] = useState<ReturnType<typeof privateDepositBalances> | null>(null)
  const [breakdown, setBreakdown] = useState<Array<{ memberId: string; claimed: bigint; remaining: bigint; refunded: bigint }> | null>(null)
  const [legacyBreakdownUnavailable, setLegacyBreakdownUnavailable] = useState(false)

  useEffect(() => {
    setPassword('')
    setBalances(null)
    setBreakdown(null)
    setLegacyBreakdownUnavailable(false)
    setError('')
  }, [plan.id, address, profileUserId])

  if (plan.createdBy !== localStorage.getItem('userId')) return null

  async function checkBalances() {
    if (!password && !cachedKeyPair) return
    if (!address || !walletProvider) {
      await openWalletModal(Number(plan.caipChainId.split(':')[1]))
      return
    }
    setBusy(true)
    setError('')
    setBalances(null)
    setBreakdown(null)
    setLegacyBreakdownUnavailable(false)
    onRefundVerified?.(false)
    try {
      const chain = getChain(plan.caipChainId)
      if (!chain?.vaultAddress || plan.privacyLeafIndex == null || !plan.privacyDepositLeaf || plan.privacyTier == null) {
        throw new Error('Confirmed deposit data is incomplete')
      }
      const chainId = Number(chain.chainId)
      await selectWalletNetwork(chainId)
      const activeChain = await walletProvider.request<string>({ method: 'eth_chainId' })
      if (parseInt(activeChain, 16) !== chainId) throw new Error('Wallet did not switch to the deposit network')
      const walletClient = createWalletClient({ account: address as Hex, transport: custom(walletProvider) })
      const keyPair = cachedKeyPair ?? await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])
      const profile = await apis.auth.getMyGravArcUserInfo()
      if (!profile || profile.address.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Connect the deposit creator’s bound wallet')
      }
      const refundableState = plan.privacyRefundable ? await readRefundableDepositState(plan, keyPair, address) : null
      const payload = refundableState?.payload ?? await loadDepositorPayload(plan.id, keyPair)
      if (payload.leafIndex !== plan.privacyLeafIndex || payload.tier !== plan.privacyTier ||
        !sameDepositLeaf(payload.depositLeaf, plan.privacyDepositLeaf) ||
        payload.token.toLowerCase() !== plan.tokenAddress?.toLowerCase()) {
        throw new Error('Depositor recovery data does not match this deposit')
      }
      if (!refundableState) {
        const path = await apis.transaction.getDepositMembershipPath(plan.caipChainId, payload.leafIndex)
        await verifyDepositMembershipPath(path, payload.leafIndex, payload.authRoot, payload.depositorSecretHash, payload.depositLeaf)
      }
      const isStatusPayload = 'version' in payload && payload.version === 2 && 'entries' in payload
      setLegacyBreakdownUnavailable(!isStatusPayload)
      if (plan.privacyRefundable) {
        if (!Array.isArray(payload.slots)) throw new Error('Depositor refund data is unavailable')
        if (!isStatusPayload) await verifyRefundPayloadCommitment(payload as Parameters<typeof verifyRefundPayloadCommitment>[0])
      } else if (Array.isArray(payload.slots)) {
        throw new Error('Non-refundable status data must not contain withdrawal secrets')
      }
      let statusPayload: DepositorStatusPayload | null = null
      let allocations: Array<{ memberId: string; address: string; amount: string }> = []
      if (isStatusPayload) {
        statusPayload = payload as DepositorStatusPayload
        const data = await apis.transaction.getPrivacyDepositData(plan.id)
        if (!data.encryptedPlan || data.depositorAddress.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Encrypted payroll plan is unavailable for this depositor')
        }
        const decrypted = JSON.parse(naclDecryptWithKeyPair(data.encryptedPlan, keyPair)) as {
          orgId: string; caipChainId: string; tokenAddress: string
          allocations: Array<{ memberId: string; address: string; amount: string }>
        }
        if (decrypted.orgId !== plan.orgId || decrypted.caipChainId !== plan.caipChainId ||
          decrypted.tokenAddress.toLowerCase() !== plan.tokenAddress?.toLowerCase() ||
          !Array.isArray(decrypted.allocations)) {
          throw new Error('Encrypted payroll plan does not match this deposit')
        }
        allocations = decrypted.allocations
        await verifyClaimStatusEntries(statusPayload, allocations)
      }
      const publicClient = createPublicClient({ transport: custom(walletProvider) })
      const amounts = new Map(allocations.map(allocation => [allocation.memberId, allocation.amount]))
      const slots = statusPayload ? statusPayload.entries.map((entry, index) => statusPayload.slots
        ? { withdrawAmount: amounts.get(entry[0])!, nullifier: statusPayload.slots[index].nullifier }
        : { withdrawAmount: amounts.get(entry[0])!, nullifierHash: entry[1]! })
        : (payload.slots ?? []).map(slot => ({ withdrawAmount: slot.withdrawAmount, nullifier: slot.nullifier }))
      if (slots.length === 0) throw new Error(t('pages.transactionDetail.privateStatusUnavailable'))
      const states: Array<{ claimed: bigint; refunded: boolean }> = refundableState?.states ?? []
      for (const slot of refundableState ? [] : slots) {
        if (BigInt(slot.withdrawAmount) === 0n) {
          states.push({ claimed: 0n, refunded: false })
          continue
        }
        const nullifierHash = 'nullifierHash' in slot ? slot.nullifierHash as Hex : await computeNullifierHash(slot.nullifier)
        const claimed = await pacedRpcRead(plan.caipChainId, () => publicClient.readContract({
          address: chain.vaultAddress as Hex, abi: GRAVARC_ABI, functionName: 'nullifierHashes', args: [nullifierHash],
        }))
        const refunded = await pacedRpcRead(plan.caipChainId, () => publicClient.readContract({
          address: chain.vaultAddress as Hex, abi: GRAVARC_ABI, functionName: 'refundedNullifierHashes', args: [nullifierHash],
        }))
        states.push({ claimed: claimed[0], refunded })
      }
      // Refundable chain reads include the full tier, including padding slots.
      setBalances(privateDepositBalances(refundableState ? refundableState.payload.slots : slots, states))
      onRefundVerified?.(refundableState?.fullyRefunded ?? false)
      if (rememberKey) cacheKeyPair(keyPair)
      if (statusPayload) setBreakdown(statusPayload.entries.map((entry, index) => ({
        memberId: entry[0],
        claimed: states[index].claimed,
        remaining: states[index].refunded ? 0n : BigInt(amounts.get(entry[0])!) - states[index].claimed,
        refunded: states[index].refunded ? BigInt(amounts.get(entry[0])!) - states[index].claimed : 0n,
      })))
    } catch (cause) {
      onRefundVerified?.(false)
      const message = cause instanceof Error ? cause.message : 'Could not read deposit state'
      setError(message === 'Depositor recovery data is unavailable for this deposit'
        ? t('pages.transactionDetail.privateStatusUnavailable') : message)
    } finally {
      setBusy(false)
    }
  }

  const amount = (value: bigint) => `${formatUnits(value, decimals)} ${symbol}`
  return (
    <div className="rounded-[18px] bg-[#f5f5f5] p-4 flex flex-col gap-3">
      <p className="text-[14px] font-medium text-[#1c1c26]">{t('pages.transactionDetail.privateDepositStatus')}</p>
      <p className="text-[13px] text-[#606067]">{t('pages.transactionDetail.privateStatusHelp')}</p>
      <div className="flex flex-wrap gap-2">
        <input type="password" value={password} onChange={event => { setPassword(event.target.value); forgetKeyPair(); setBalances(null); setBreakdown(null) }}
          autoComplete="off" placeholder={t('pages.transactions.gravArcRefundPasswordPlaceholder')}
          className="rounded-[12px] bg-white px-3 py-2 text-[13px] outline-none" />
        <button type="button" onClick={() => void checkBalances()} disabled={busy || (!password && !cachedKeyPair)}
          className="rounded-[12px] bg-[#5e85ee] px-3 py-2 text-[13px] text-white disabled:opacity-40">
          {busy ? t('common.loading') : t('pages.transactionDetail.checkPrivateStatus')}
        </button>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-[#606067]">
        <input type="checkbox" checked={rememberKey} onChange={event => setRememberKey(event.target.checked)} />
        {t('pages.memberClaim.rememberSession')}
      </label>
      {error && <p className="text-[13px] text-[#d92b2b]">{error}</p>}
      {balances && (
        <div className="grid gap-2 text-[13px] text-[#1c1c26] sm:grid-cols-2">
          <p>{t('pages.transactionDetail.totalAmount')}: {amount(balances.total)}</p>
          <p>{t('pages.transactionDetail.claimedAmount')}: {amount(balances.claimed)}</p>
          <p>{t('pages.transactionDetail.remainingAmount')}: {amount(balances.remaining)}</p>
          {balances.refunded > 0n && <p>{t('pages.transactionDetail.refundedAmount')}: {amount(balances.refunded)}</p>}
        </div>
      )}
      {legacyBreakdownUnavailable && <p className="text-[13px] text-[#606067]">{t('pages.transactionDetail.privateStatusUnavailable')}</p>}
      {breakdown && <div className="flex flex-col gap-2 text-[13px] text-[#1c1c26]">
        <p className="font-medium">{t('pages.transactionDetail.receiverClaims')}</p>
        {breakdown.map(item => <div key={item.memberId} className="rounded-[12px] bg-white p-3">
          <p>{plan.items.find(row => row.member?.memberId === item.memberId)?.member?.showName ?? item.memberId}</p>
          <p>{t('pages.transactionDetail.claimedAmount')}: {amount(item.claimed)}</p>
          <p>{t('pages.transactionDetail.remainingAmount')}: {amount(item.remaining)}</p>
          {item.refunded > 0n && <p>{t('pages.transactionDetail.refundedAmount')}: {amount(item.refunded)}</p>}
        </div>)}
      </div>}
    </div>
  )
}
