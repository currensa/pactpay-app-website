import apis from '@/apis'
import type { FavoriteAddressItem } from '@/apis/favorite-address.api'
import type { PrivacyPayrollItem, WithdrawalBatchResult } from '@/apis/transaction.api'
import { useToast } from '@/components/ui/use-toast'
import { deriveNaclKeyPair } from '@/lib/gravarc/naclCrypto'
import { defiAllocationItem } from '@/lib/gravarc/defi/allocationItem'
import { readPrivacyWithdrawState, withdrawPrivacyItem } from '@/lib/gravarc/privacyWithdraw'
import { validatePrivateWithdrawAmount } from '@/lib/gravarc/privateWithdrawBalance'
import { buildExplorerTransactionUrl } from '@/utils/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import { openWalletModal, selectWalletNetwork } from '@/providers/app-kit-provider'
import { usePrivacyUnlock } from '@/providers/privacy-unlock-provider'
import useAuthStore from '@/stores/auth'
import useHeaderStore from '@/stores/header'
import { useTranslation } from '@/utils/i18n'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconLoader2 } from '@tabler/icons-react'
import axios from 'axios'
import { ethers } from 'ethers'
import { AlertTriangle, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWalletClient, custom, type Hex } from 'viem'

// ─── Asset icon ───────────────────────────────────────────────────────────────

function AssetIcon({ iconUrl, label }: { iconUrl: string | null; label: string }) {
  if (iconUrl) {
    return <img src={iconUrl} alt={label} className="h-[32px] w-[32px] shrink-0 rounded-full object-cover" />
  }
  return (
    <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#8d8d93]">
      <span className="text-[12px] font-bold text-white">{(label[0] ?? '?').toUpperCase()}</span>
    </div>
  )
}
// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingToken {
  tokenAddress: string
  caipChainId: string
  symbol: string
  amount: number
  iconUrl: string | null
}

interface RecentRecipientItem {
  address: string
  caipChainId: string
  usedAt: string
}

interface RecipientSuggestionItem {
  source: 'recent' | 'addressBook'
  address: string
  caipChainId: string
  label: string | null
  matchedAddressBookLabel?: string | null
  usedAt?: string
}

function formatRecentUsedDate(dateValue: string | undefined) {
  if (!dateValue) return '--'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClaimPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { address } = useAppKitAccount()
  const profileUserId = useAuthStore(state => state.gravArcUserInfo?.userId)
  const { rememberKey, setRememberKey, cachedKeyPair, cacheKeyPair, forgetKeyPair } = usePrivacyUnlock()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const userAction = useRef(false)
  const { fetchChainAssets, fetchChains, getTokenSymbol, getTokenDecimals, getTokenIconUrl, chains } = useChainAssetStore()
  const { setHeader, clearHeader } = useHeaderStore()

  const [summaryLoading, setSummaryLoading] = useState(false)
  const [allPending, setAllPending] = useState<PendingToken[]>([])
  const [privateItems, setPrivateItems] = useState<PrivacyPayrollItem[]>([])
  const [privateBalances, setPrivateBalances] = useState<Record<string, Awaited<ReturnType<typeof readPrivacyWithdrawState>>>>({})
  const [selectedPrivateItemId, setSelectedPrivateItemId] = useState('')
  const [privateAmount, setPrivateAmount] = useState('')
  const [checkingPrivate, setCheckingPrivate] = useState(false)
  const [selectedChain, setSelectedChain] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<WithdrawalBatchResult | null>(null)
  const [favoriteAddresses, setFavoriteAddresses] = useState<FavoriteAddressItem[]>([])
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipientItem[]>([])
  // Privacy withdraw (privacy_deposit) — password unlocks the encrypted Secret + message
  const [password, setPassword] = useState('')
  const [privacyStatus, setPrivacyStatus] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const recipientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPassword('')
    setPrivateBalances({})
    setSelectedPrivateItemId('')
    setPrivateAmount('')
  }, [address, profileUserId])

  // Derived
  const availableChainIds = [...new Set([...allPending.map(p => p.caipChainId), ...privateItems.map(p => p.batch.caipChainId)])]
  const availableChains = chains.filter(c => availableChainIds.includes(c.caipChainId))
  const pendingForChain = selectedChain ? allPending.filter(p => p.caipChainId === selectedChain) : []
  const privateForChain = privateItems.filter(item => item.batch.caipChainId === selectedChain)
  const chainHasPrivacy = privateForChain.length > 0
  const selectedPrivateItem = privateForChain.find(item => item.id === selectedPrivateItemId)
  const selectedPrivateBalance = selectedPrivateItem ? privateBalances[selectedPrivateItem.id] : undefined
  const selectedChainName = chains.find(c => c.caipChainId === selectedChain)?.name ?? ''
  const trimmedRecipient = recipient.trim()

  const addressBookSuggestions = useMemo<RecipientSuggestionItem[]>(
    () => favoriteAddresses
      .filter(item => item.caipChainId === selectedChain)
      .map(item => ({
        source: 'addressBook',
        address: item.address,
        caipChainId: item.caipChainId,
        label: item.remark,
      })),
    [favoriteAddresses, selectedChain]
  )

  const recentSuggestions = useMemo<RecipientSuggestionItem[]>(
    () => recentRecipients
      .filter(item => item.caipChainId === selectedChain)
      .map(item => {
        const matchedAddressBookItem = favoriteAddresses.find(
          favorite =>
            favorite.caipChainId === item.caipChainId
            && favorite.address.toLowerCase() === item.address.toLowerCase()
        )

        return {
          source: 'recent' as const,
          address: item.address,
          caipChainId: item.caipChainId,
          label: null,
          matchedAddressBookLabel: matchedAddressBookItem?.remark ?? null,
          usedAt: item.usedAt,
        }
      }),
    [recentRecipients, favoriteAddresses, selectedChain]
  )

  const filterSuggestionItems = (items: RecipientSuggestionItem[]) => {
    if (!trimmedRecipient) return items
    const query = trimmedRecipient.toLowerCase()
    return items.filter(item =>
      item.address.toLowerCase().includes(query)
      || item.label?.toLowerCase().includes(query)
    )
  }

  const filteredAddressBookSuggestions = filterSuggestionItems(addressBookSuggestions)
  const filteredRecentSuggestions = filterSuggestionItems(recentSuggestions)
  const latestRecentSuggestionKey = recentSuggestions[0]
    ? `${recentSuggestions[0].caipChainId}::${recentSuggestions[0].address.toLowerCase()}`
    : null
  const matchedSuggestion = [...addressBookSuggestions, ...recentSuggestions]
    .find(item => item.address.toLowerCase() === trimmedRecipient.toLowerCase())
  const recipientChain = chains.find(chain => chain.caipChainId === selectedChain) ?? null
  const isRecipientKnown = Boolean(matchedSuggestion)
  const isRecipientValidForChain = Boolean(trimmedRecipient)
    && (recipientChain?.ecosystem?.toLowerCase() !== 'evm' || ethers.isAddress(trimmedRecipient))

  useEffect(() => {
    setHeader({ backUrl: '/member/dashboard' })
    Promise.all([fetchChainAssets(), fetchChains(), loadAddressSuggestions(), loadSummary()])
    return () => clearHeader()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(e.target as Node)) {
        setRecipientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setRecipientDropdownOpen(false)
  }, [selectedChain])

  const loadAddressSuggestions = async () => {
    try {
      const [favoriteAddressData, historyData] = await Promise.all([
        apis.favoriteAddress.getList({ page: 1, pageSize: 100 }),
        apis.transaction.getMyPayrollHistory({ page: 1, pageSize: 100 }),
      ])

      setFavoriteAddresses(favoriteAddressData.data ?? [])

      const recentMap = new Map<string, RecentRecipientItem>()
      for (const tx of historyData.data ?? []) {
        for (const item of tx.items ?? []) {
          const recipientAddress = item.recipient?.trim()
          if (!recipientAddress) continue

          const dedupeKey = `${tx.caipChainId}::${recipientAddress.toLowerCase()}`
          const existing = recentMap.get(dedupeKey)
          const usedAt = item.updatedAt || tx.createdAt

          if (!existing || new Date(usedAt).getTime() > new Date(existing.usedAt).getTime()) {
            recentMap.set(dedupeKey, {
              address: recipientAddress,
              caipChainId: tx.caipChainId,
              usedAt,
            })
          }
        }
      }

      const recentList = Array.from(recentMap.values())
        .sort((left, right) => new Date(right.usedAt).getTime() - new Date(left.usedAt).getTime())
        .slice(0, 10)

      setRecentRecipients(recentList)
    } catch {
      // request interceptor handles API errors
    }
  }

  const loadSummary = async () => {
    try {
      setSummaryLoading(true)
      const [data, claimable] = await Promise.all([
        apis.transaction.getMySummary(),
        fetchAllClaimable(),
      ])
      const privacy = claimable.filter(item => item.transactionType === 'privacy_deposit' && item.withdrawData)
      setPrivateItems(privacy)
      const tokens: PendingToken[] = data.pendingClaim.map(item => ({
        tokenAddress: item.tokenAddress,
        caipChainId: item.caipChainId,
        symbol: getTokenSymbol(item.caipChainId, item.tokenAddress) ?? item.tokenAddress.slice(0, 6),
        amount: Number(item.totalAmount) / Math.pow(10, getTokenDecimals(item.caipChainId, item.tokenAddress)),
        iconUrl: getTokenIconUrl(item.caipChainId, item.tokenAddress),
      }))
      setAllPending(tokens)
      if (!selectedChain) setSelectedChain(tokens[0]?.caipChainId ?? privacy[0]?.batch.caipChainId ?? '')
    } catch {
      // request interceptor handles API errors
    } finally {
      setSummaryLoading(false)
    }
  }

  // Fetch all claimable payroll items for a chain (paginate through all pages).
  const fetchAllClaimable = async (caipChainId?: string): Promise<PrivacyPayrollItem[]> => {
    const PAGE_SIZE = 100
    let page = 1
    const items: PrivacyPayrollItem[] = []
    while (true) {
      const data = await apis.transaction.getMyPayrollItems({
        status: 'claimable',
        caipChainId,
        page,
        pageSize: PAGE_SIZE,
      })
      items.push(...(data.data ?? []))
      if (items.length >= (data.total ?? 0)) break
      page++
    }
    const [allocations, networks] = await Promise.all([
      apis.transaction.getMyDefiAllocations(), apis.chainAsset.getNetworks(),
    ])
    for (const allocation of allocations) {
      if (caipChainId && allocation.caipChainId !== caipChainId) continue
      const network = networks.find(entry => entry.caipChainId === allocation.caipChainId)
      if (network) items.push(defiAllocationItem(allocation, network))
    }
    return items
  }

  const checkPrivateBalances = async () => {
    if (!selectedChain || !chainHasPrivacy) return
    if (!address || !walletProvider) {
      await openWalletModal(Number(selectedChain.split(':')[1]))
      return
    }
    if (!password && !cachedKeyPair) {
      toast({ description: t('pages.memberClaim.enterPasswordToast'), variant: 'destructive' })
      return
    }
    try {
      setCheckingPrivate(true)
      const chainEntry = chains.find(chain => chain.caipChainId === selectedChain)
      if (!chainEntry) throw new Error('Selected chain is not configured')
      const chainIdNum = Number(chainEntry.chainId)
      await selectWalletNetwork(chainIdNum)
      const currentChainIdHex = await walletProvider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== chainIdNum) throw new Error('Wallet did not switch to the claim network')
      let keyPair = cachedKeyPair
      if (!keyPair) {
        const walletClient = createWalletClient({ account: address as Hex, transport: custom(walletProvider) })
        keyPair = await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])
      }
      const balances: typeof privateBalances = {}
      for (const item of privateForChain) {
        balances[item.id] = await readPrivacyWithdrawState(item, keyPair, walletProvider)
      }
      if (rememberKey) cacheKeyPair(keyPair)
      setPrivateBalances(balances)
      const first = privateForChain.find(item => balances[item.id]?.remaining > 0n)
      if (first) {
        setSelectedPrivateItemId(first.id)
        setPrivateAmount(ethers.formatUnits(balances[first.id].remaining, getTokenDecimals(selectedChain, first.tokenAddress)))
      } else {
        setSelectedPrivateItemId('')
        setPrivateAmount('')
      }
    } catch (error) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Could not read private balances', variant: 'destructive' })
    } finally {
      setCheckingPrivate(false)
    }
  }

  // ── Privacy withdraw branch: decrypt → ZK proof → on-chain withdraw → confirm-withdraw ──
  const runPrivacyWithdraw = async (
    item: PrivacyPayrollItem,
    expectedAmount: bigint,
    chainIdNum: number,
    chainName: string,
    explorerUrl: string | null,
  ): Promise<WithdrawalBatchResult> => {
    const succeeded: WithdrawalBatchResult['succeeded'] = []
    const failed: WithdrawalBatchResult['failed'] = []

    let keyPair = cachedKeyPair
    if (!keyPair) {
      const walletClient = createWalletClient({ account: address! as Hex, transport: custom(walletProvider!) })
      keyPair = await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])
    }

    try {
      const res = await withdrawPrivacyItem({
        item,
        recipient: trimmedRecipient,
        expectedAmount,
        keyPair,
        walletProvider: walletProvider!,
        account: address!,
        chainIdNum,
        chainName,
        delegate: false,
        onStatus: msg => setPrivacyStatus(`${item.transactionName ?? item.id}: ${msg}`),
      })
      if (rememberKey) cacheKeyPair(keyPair)
      succeeded.push({
        payrollItemId: item.id,
        txUrl: buildExplorerTransactionUrl(explorerUrl, res.txHash) ?? '',
        transactionName: item.transactionName ?? item.id,
      })
    } catch (err: any) {
      if (axios.isAxiosError(err)) throw err
      const reason = err?.code === 'nothing-to-claim'
        ? 'Already withdrawn'
        : (err?.shortMessage || err?.message || 'Withdraw failed')
      failed.push({ payrollItemId: item.id, reason })
    }
    setPrivacyStatus('')
    return { succeeded, failed }
  }

  const handleClaim = async () => {
    if (!selectedChain) {
      toast({ description: t('pages.memberClaim.selectNetworkToast'), variant: 'destructive' })
      return
    }
    if (!trimmedRecipient) {
      toast({ description: t('pages.memberClaim.enterRecipientToast'), variant: 'destructive' })
      return
    }
    if (!isRecipientValidForChain) {
      toast({ description: t('pages.memberClaim.validAddressToast'), variant: 'destructive' })
      return
    }
    if (!address || !walletProvider) {
      userAction.current = true
      void openWalletModal(Number(selectedChain.split(':')[1])).catch(error => {
        userAction.current = false
        toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Could not connect wallet', variant: 'destructive' })
      })
      return
    }

    try {
      setClaiming(true)
      setClaimResult(null)

      const items = await fetchAllClaimable(selectedChain)
      if (items.length === 0) {
        toast({ description: t('pages.memberClaim.noPendingItemsNetwork') })
        return
      }
      const item = items.find(i => i.id === selectedPrivateItemId && i.transactionType === 'privacy_deposit' && i.withdrawData)
      if (!item) throw new Error('Select one private allocation and check its live balance first')
      const balance = privateBalances[item.id]
      if (!balance || balance.remaining <= 0n) throw new Error('Refresh the live balance before withdrawing')
      const decimals = getTokenDecimals(selectedChain, item.tokenAddress)
      let expectedAmount: bigint
      try { expectedAmount = ethers.parseUnits(privateAmount.trim(), decimals) }
      catch { throw new Error('Enter a valid withdrawal amount') }
      validatePrivateWithdrawAmount(expectedAmount, balance.remaining)

      if (!password && !cachedKeyPair) {
        toast({ description: t('pages.memberClaim.enterPasswordToast'), variant: 'destructive' })
        return
      }

      const chainEntry = chains.find(c => c.caipChainId === selectedChain)
      if (!chainEntry?.chainId) throw new Error(`Chain ${selectedChain} is not configured.`)
      const chainIdNum = parseInt(chainEntry.chainId, 10)
      const explorerUrl = chainEntry.explorerUrls?.[0] ?? null

      // Switch the wallet to the target chain once, up-front, for both branches.
      await selectWalletNetwork(chainIdNum)
      const currentChainIdHex = await walletProvider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== chainIdNum) throw new Error('Wallet did not switch to the claim network')

      const succeeded: WithdrawalBatchResult['succeeded'] = []
      const failed: WithdrawalBatchResult['failed'] = []

      const r = await runPrivacyWithdraw(item, expectedAmount, chainIdNum, chainEntry.name, explorerUrl)
      succeeded.push(...r.succeeded)
      failed.push(...r.failed)



      setClaimResult({ succeeded, failed })
      await Promise.all([loadSummary(), loadAddressSuggestions()])
      if (succeeded.length) await checkPrivateBalances()
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return
      }
      toast({
        title: t('common.error'),
        description: error?.shortMessage || error?.message || t('pages.memberClaim.failedSubmit'),
        variant: 'destructive',
      })
    } finally {
      setClaiming(false)
      setPrivacyStatus('')
    }
  }

  // Auto-trigger claim after wallet connects
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!userAction.current) return
    if (!address || !walletProvider) return
    userAction.current = false
    handleClaim()
  }, [address, walletProvider])

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="bg-white rounded-[32px] p-[24px] flex flex-col gap-[24px]">

        {/* Network selector */}
        <div className="flex flex-col gap-[8px] max-w-[700px]">
          <p className="text-[14px] leading-[22px] font-semibold text-[#1c1c26]">{t('pages.memberClaim.network')}</p>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              disabled={summaryLoading}
              className="w-full bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px] flex items-center justify-between text-[14px] leading-[22px] disabled:opacity-50 outline-none"
            >
              {selectedChainName ? (
                <span className="flex items-center gap-[8px] text-[#1c1c26]">
                  <AssetIcon iconUrl={chains.find(c => c.caipChainId === selectedChain)?.iconUrl ?? null} label={selectedChainName} />
                  {selectedChainName}
                </span>
              ) : (
                <span className="text-[#bbbbbe]">{t('pages.memberClaim.select')}</span>
              )}
              <ChevronDown className="h-[20px] w-[20px] text-[#606067] shrink-0" />
            </button>
            {dropdownOpen && availableChains.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-[4px] bg-white rounded-[12px] border border-[rgba(0,0,0,0.12)] shadow-lg z-10 overflow-hidden">
                {availableChains.map(chain => (
                  <button
                    key={chain.caipChainId}
                    onClick={() => {
                      setSelectedChain(chain.caipChainId)
                      setSelectedPrivateItemId('')
                      setPrivateBalances({})
                      setPrivateAmount('')
                      setDropdownOpen(false)
                    }}
                    className={`w-full px-[16px] py-[10px] flex items-center gap-[8px] text-left text-[14px] leading-[22px] hover:bg-[#f5f5f5] transition-colors ${selectedChain === chain.caipChainId ? 'text-[#5e85ee] font-medium' : 'text-[#1c1c26]'
                      }`}
                  >
                    <AssetIcon iconUrl={chain.iconUrl} label={chain.name} />
                    {chain.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending to claim */}
        <div className="flex flex-col gap-[8px] max-w-[700px]">
          <p className="text-[14px] leading-[22px] font-semibold text-[#1c1c26]">{t('pages.memberClaim.pendingToClaim')}</p>
          <div className="flex flex-col gap-[16px]">
            {summaryLoading ? (
              <div className="flex items-center gap-[8px] py-[8px] text-[14px] text-[#8d8d93]">
                <IconLoader2 className="h-[16px] w-[16px] animate-spin" />
                {t('common.loading')}
              </div>
            ) : pendingForChain.length === 0 && privateForChain.length === 0 ? (
              <p className="text-[14px] leading-[22px] text-[#8d8d93] py-[4px]">
                {selectedChain ? t('pages.memberClaim.noPendingForNetwork') : t('pages.memberClaim.selectNetworkToView')}
              </p>
            ) : (
              <>
              {pendingForChain.map(token => (
                <div
                  key={token.tokenAddress}
                  className="bg-[#f5f5f5] rounded-[16px] px-[16px] py-[10px] flex items-center justify-between"
                >
                  <div className="flex items-center gap-[6px]">
                    <AssetIcon iconUrl={token.iconUrl} label={token.symbol} />
                    <p className="text-[16px] leading-[24px] text-black">{token.symbol}</p>
                  </div>
                  <p className="text-[18px] leading-[28px] font-bold text-[#1c1c26]">
                    {token.amount.toLocaleString()}
                  </p>
                </div>
              ))}
              {privateForChain.map(item => {
                const balance = privateBalances[item.id]
                const decimals = getTokenDecimals(selectedChain, item.tokenAddress)
                const symbol = getTokenSymbol(selectedChain, item.tokenAddress) ?? item.tokenAddress.slice(0, 6)
                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={!balance || balance.remaining <= 0n}
                    onClick={() => {
                      setSelectedPrivateItemId(item.id)
                      setPrivateAmount(ethers.formatUnits(balance.remaining, decimals))
                    }}
                    className={`w-full rounded-[16px] border px-[16px] py-[10px] text-left disabled:cursor-not-allowed ${selectedPrivateItemId === item.id ? 'border-[#5e85ee]' : 'border-transparent'} bg-[#f5f5f5]`}
                  >
                    <span className="text-[14px] text-[#1c1c26]">{item.transactionName ?? item.id} · {symbol}</span>
                    <span className="block text-[13px] text-[#606067]">
                      {!balance ? t('pages.memberClaim.privateUnlockBalance') : (
                        <>
                          {t('pages.memberClaim.privateTotal')}: {ethers.formatUnits(balance.total, decimals)} · {t('pages.memberClaim.privateClaimed')}: {ethers.formatUnits(balance.claimed, decimals)} · {t('pages.memberClaim.privateRemaining')}: {ethers.formatUnits(balance.remaining, decimals)}
                          {balance.refunded ? ` · ${t('pages.memberClaim.privateRefunded')}` : ''}
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
              </>
            )}
          </div>
        </div>

        {/* Receive Address */}
        <div className="flex flex-col gap-[8px] max-w-[700px]">
          <p className="text-[14px] leading-[22px] font-semibold text-[#1c1c26]">{t('pages.memberClaim.receiveAddress')}</p>
          <div className="flex flex-col gap-[8px]">
            <div className="relative" ref={recipientDropdownRef}>
              <input
                value={recipient}
                onChange={e => {
                  setRecipient(e.target.value)
                  setRecipientDropdownOpen(true)
                }}
                onFocus={() => setRecipientDropdownOpen(true)}
                placeholder="0x..."
                className="w-full rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
              />

              {recipientDropdownOpen && selectedChain && (
                <div className="absolute top-full left-0 right-0 z-20 mt-[6px] overflow-hidden rounded-[16px] border border-[rgba(28,28,38,0.12)] bg-white shadow-[0px_12px_26px_0px_rgba(0,0,0,0.08)]">
                  <div className="max-h-[380px] overflow-y-auto">
                    <div className="border-b border-[rgba(28,28,38,0.08)]">
                      <div className="flex items-center justify-between bg-[#f5f5f5] px-[16px] py-[10px]">
                        <div className="flex items-center gap-[6px]">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] leading-[18px] text-[#6b6a67]">{t('pages.memberClaim.recent')}</p>
                        </div>
                      </div>
                      {filteredRecentSuggestions.length === 0 ? (
                        <p className="px-[16px] py-[14px] text-[13px] leading-[20px] text-[#8d8d93]">
                          {t('pages.memberClaim.noRecordsFound')}
                        </p>
                      ) : (
                        filteredRecentSuggestions.map((item, index) => (
                          <button
                            key={`recent-${item.caipChainId}-${item.address}`}
                            type="button"
                            onClick={() => {
                              setRecipient(item.address)
                              setRecipientDropdownOpen(false)
                            }}
                            className={`flex w-full items-start justify-between gap-[12px] px-[16px] py-[14px] text-left transition-colors hover:bg-[#fafafa] ${index < filteredRecentSuggestions.length - 1 ? 'border-t border-[rgba(28,28,38,0.08)]' : ''}`}
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-[12px]">
                              <span className={`mt-[8px] h-[10px] w-[10px] shrink-0 rounded-full ${item.matchedAddressBookLabel ? 'bg-[#57c271]' : 'bg-[#8d8d93]'}`} />
                              {item.matchedAddressBookLabel ? (
                                <div className="min-w-0 flex-1">
                                  <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">{item.matchedAddressBookLabel}</p>
                                  <p className="break-all text-[13px] leading-[20px] text-[#606067]">{item.address}</p>
                                </div>
                              ) : (
                                <div className="min-w-0 flex-1">
                                  <p className="break-all text-[14px] font-medium leading-[22px] text-[#1c1c26]">{item.address}</p>
                                  <p className="text-[12px] leading-[18px] text-[#8d8d93]">
                                    {t('pages.memberClaim.used', { date: formatRecentUsedDate(item.usedAt) })}
                                  </p>
                                </div>
                              )}
                            </div>
                            {latestRecentSuggestionKey === `${item.caipChainId}::${item.address.toLowerCase()}` && (
                              <div className="shrink-0 rounded-[999px] bg-[rgba(87,194,113,0.14)] px-[10px] py-[4px] text-[12px] font-medium leading-[16px] text-[#57c271]">
                                {t('pages.memberClaim.lastUsed')}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-[12px] bg-[#f5f5f5] px-[16px] py-[10px]">
                        <div className="flex items-center gap-[6px]">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] leading-[18px] text-[#6b6a67]">{t('pages.memberClaim.addressBook')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/member/settings')}
                          className="flex items-center gap-[2px] text-[12px] font-medium leading-[18px] text-[#5e85ee] hover:opacity-80"
                        >
                          {t('pages.memberClaim.manage')}
                          <ChevronRight className="h-[14px] w-[14px]" />
                        </button>
                      </div>
                      {filteredAddressBookSuggestions.length === 0 ? (
                        <p className="border-t border-[rgba(28,28,38,0.08)] px-[16px] py-[14px] text-[13px] leading-[20px] text-[#8d8d93]">
                          {t('pages.memberClaim.noRecordsFound')}
                        </p>
                      ) : (
                        filteredAddressBookSuggestions.map((item, index) => (
                          <button
                            key={`address-book-${item.caipChainId}-${item.address}`}
                            type="button"
                            onClick={() => {
                              setRecipient(item.address)
                              setRecipientDropdownOpen(false)
                            }}
                            className={`flex w-full items-start justify-between gap-[12px] px-[16px] py-[14px] text-left transition-colors hover:bg-[#fafafa] ${index === 0 ? 'border-t border-[rgba(28,28,38,0.08)]' : 'border-t border-[rgba(28,28,38,0.08)]'}`}
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-[12px]">
                              <span className="mt-[8px] h-[10px] w-[10px] shrink-0 rounded-full bg-[#5e85ee]" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold leading-[22px] text-[#1c1c26]">{item.label || t('pages.memberClaim.untitled')}</p>
                                <p className="break-all text-[13px] leading-[20px] text-[#606067]">{item.address}</p>
                              </div>
                            </div>
                            <div className="shrink-0 rounded-[999px] bg-[rgba(94,133,238,0.12)] px-[10px] py-[4px] text-[12px] font-medium leading-[16px] text-[#5e85ee]">
                              {t('pages.memberClaim.saved')}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {trimmedRecipient && isRecipientValidForChain && isRecipientKnown && (
              <div className="flex items-start gap-[8px] rounded-[12px] bg-[rgba(93,221,34,0.10)] px-[12px] py-[10px]">
                <Check className="mt-[2px] h-[16px] w-[16px] shrink-0 text-[#3e9b1f]" />
                <p className="text-[13px] leading-[20px] text-[#1c1c26]">
                  {t('pages.memberClaim.foundIn', { source: matchedSuggestion?.source === 'addressBook' ? t('pages.memberClaim.addressBook') : t('pages.memberClaim.recentSource') })}
                </p>
              </div>
            )}

            {trimmedRecipient && isRecipientValidForChain && !isRecipientKnown && (
              <div className="flex items-start gap-[8px] rounded-[12px] bg-[rgba(255,168,0,0.12)] px-[12px] py-[10px]">
                <AlertTriangle className="mt-[2px] h-[16px] w-[16px] shrink-0 text-[#c67b00]" />
                <p className="text-[13px] leading-[20px] text-[#1c1c26]">
                  <span className="font-semibold">⚠️ </span>
                  {t('pages.memberClaim.unknownAddressWarning')}
                </p>
              </div>
            )}

            {!trimmedRecipient || isRecipientValidForChain ? (
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">
                {t('pages.memberClaim.recipientHelp')}
              </p>
            ) : (
              <p className="text-[14px] leading-[22px] text-[#d92b2b]">
                {t('pages.memberClaim.validAddressToast')}
              </p>
            )}
          </div>
        </div>

        {/* Password — only for chains that have privacy_deposit withdrawals pending */}
        {chainHasPrivacy && (
          <div className="flex flex-col gap-[8px] max-w-[700px]">
            <p className="text-[14px] leading-[22px] font-semibold text-[#1c1c26]">{t('pages.memberClaim.password')}</p>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                forgetKeyPair()
                setPrivateBalances({})
                setSelectedPrivateItemId('')
                setPrivateAmount('')
              }}
              placeholder={t('pages.memberClaim.passwordPlaceholder')}
              autoComplete="off"
              className="w-full rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
            />
            <label className="flex cursor-pointer select-none items-center gap-[8px]">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={e => setRememberKey(e.target.checked)}
                className="size-[16px] cursor-pointer accent-[#5e85ee]"
              />
              <span className="text-[13px] leading-[20px] text-[#606067]">{t('pages.memberClaim.rememberSession')}</span>
            </label>
            <label className="flex select-none items-center gap-[8px] opacity-50">
              <input
                type="checkbox"
                checked={false}
                disabled
                className="size-[16px] accent-[#5e85ee]"
              />
              <span className="text-[13px] leading-[20px] text-[#606067]">{t('pages.memberClaim.delegateToServer')} ({t('common.comingSoon')})</span>
            </label>
            <p className="text-[13px] leading-[20px] text-[#8d8d93]">
              {t('pages.memberClaim.privacyWithdrawHelp')}
            </p>
            <button
              type="button"
              onClick={checkPrivateBalances}
              disabled={checkingPrivate || (!password && !cachedKeyPair)}
              className="w-fit rounded-[12px] border border-[#5e85ee] px-[14px] py-[8px] text-[13px] text-[#5e85ee] disabled:opacity-40"
            >
              {checkingPrivate ? 'Checking on-chain balances…' : 'Check private balances'}
            </button>
            {selectedPrivateItem && selectedPrivateBalance?.remaining && selectedPrivateBalance.remaining > 0n && (
              <label className="flex flex-col gap-[6px] text-[13px] text-[#606067]">
                Amount to withdraw ({getTokenSymbol(selectedChain, selectedPrivateItem.tokenAddress) ?? selectedPrivateItem.tokenAddress.slice(0, 6)})
                <input
                  type="text"
                  inputMode="decimal"
                  value={privateAmount}
                  onChange={event => setPrivateAmount(event.target.value)}
                  className="rounded-[12px] bg-[#f5f5f5] px-[16px] py-[12px] text-[14px] text-[#1c1c26] outline-none"
                />
              </label>
            )}
          </div>
        )}

        {/* Claim button */}
        <div className="flex flex-col gap-[8px]">
          <button
            onClick={handleClaim}
            disabled={
              claiming
              || summaryLoading
              || !selectedChain
              || !selectedPrivateItemId
              || !selectedPrivateBalance
              || selectedPrivateBalance.remaining <= 0n
              || !privateAmount.trim()
              || (chainHasPrivacy && !password && !cachedKeyPair)
            }
            className="flex w-fit items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[14px] py-[10px] text-[14px] leading-[22px] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {claiming && <IconLoader2 className="h-[14px] w-[14px] animate-spin" />}
            {t('pages.memberClaim.claim')}
          </button>
          {claiming && privacyStatus && (
            <p className="text-[13px] leading-[20px] text-[#606067]">{privacyStatus}</p>
          )}
        </div>

        {/* Claim result */}
        {claimResult && (
          <div className="flex flex-col gap-[12px] max-w-[700px]">
            {claimResult.succeeded.length > 0 && (
              <div className="rounded-[16px] bg-[rgba(93,221,34,0.12)] p-[16px] flex flex-col gap-[8px]">
                <p className="text-[14px] font-semibold text-[#1c1c26]">
                  {t('pages.memberClaim.claimedSuccessfully', { count: claimResult.succeeded.length })}
                </p>
                {claimResult.succeeded.map(s => (
                  <div key={s.payrollItemId} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#606067]">{s.transactionName || s.payrollItemId}</span>
                    <a
                      href={s.txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5e85ee] underline hover:opacity-80"
                    >
                      {t('pages.memberClaim.view')} →
                    </a>
                  </div>
                ))}
              </div>
            )}
            {claimResult.failed.length > 0 && (
              <div className="rounded-[16px] bg-[rgba(217,43,43,0.08)] p-[16px] flex flex-col gap-[8px]">
                <p className="text-[14px] font-semibold text-[#d92b2b]">
                  {t('pages.memberClaim.failedCount', { count: claimResult.failed.length })}
                </p>
                {claimResult.failed.map(f => (
                  <p key={f.payrollItemId} className="text-[13px] text-[#606067]">
                    {f.payrollItemId} — {f.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
