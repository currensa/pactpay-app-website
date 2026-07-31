import apis from '@/apis'
import type { FavoriteAddressItem } from '@/apis/favorite-address.api'
import type { BatchClaimResponse, StealthPayrollItem } from '@/apis/transaction.api'
import { useToast } from '@/components/ui/use-toast'
import { vaultAbi } from '@/lib/vault-abi'
import { recoverStealthPrivateKey } from '@/lib/stealth-key'
import { deriveNaclKeyPair } from '@/lib/gravarc/naclCrypto'
import { withdrawPrivacyItem } from '@/lib/gravarc/privacyWithdraw'
import { buildExplorerTransactionUrl } from '@/utils/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useHeaderStore from '@/stores/header'
import { useTranslation } from '@/utils/i18n'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconLoader2 } from '@tabler/icons-react'
import axios from 'axios'
import { ethers } from 'ethers'
import { AlertTriangle, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPublicClient, createWalletClient, custom, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deriveMetaPrivKey(walletProvider: Provider, address: string): Promise<Uint8Array> {
  const { signMessage } = await apis.auth.getMySignMessage()
  const sig = await walletProvider.request<string>({
    method: 'personal_sign',
    params: [signMessage, address],
  }) as string
  const sigBytes = ethers.getBytes(sig)
  try {
    return ethers.getBytes(ethers.keccak256(sigBytes))
  } finally {
    sigBytes.fill(0)
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClaimPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { open } = useAppKit()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const userAction = useRef(false)
  const { fetchChainAssets, fetchChains, getTokenSymbol, getTokenDecimals, getTokenIconUrl, chains } = useChainAssetStore()
  const { setHeader, clearHeader } = useHeaderStore()

  const walletToken = sessionStorage.getItem('metapub-verify-token') ?? undefined

  const [summaryLoading, setSummaryLoading] = useState(false)
  const [allPending, setAllPending] = useState<PendingToken[]>([])
  const [selectedChain, setSelectedChain] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<BatchClaimResponse | null>(null)
  const [favoriteAddresses, setFavoriteAddresses] = useState<FavoriteAddressItem[]>([])
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipientItem[]>([])
  // Privacy withdraw (privacy_deposit) — password unlocks the encrypted Secret + message
  const [password, setPassword] = useState('')
  const [rememberKey, setRememberKey] = useState(false)
  const [chainHasPrivacy, setChainHasPrivacy] = useState(false)
  const [privacyStatus, setPrivacyStatus] = useState('')
  // Delegate privacy withdrawals to the platform relayer (member pays no gas). Default on.
  const [delegateToServer, setDelegateToServer] = useState(true)
  const cachedKeyPairRef = useRef<Awaited<ReturnType<typeof deriveNaclKeyPair>> | null>(null)
  const relayerAddressRef = useRef<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const recipientDropdownRef = useRef<HTMLDivElement>(null)

  // Derived
  const availableChainIds = [...new Set(allPending.map(p => p.caipChainId))]
  const availableChains = chains.filter(c => availableChainIds.includes(c.caipChainId))
  const pendingForChain = selectedChain ? allPending.filter(p => p.caipChainId === selectedChain) : []
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
    // Note: stealth claims require `walletToken` (metapub verification), but privacy
    // withdrawals do not — so we no longer redirect on a missing token. The token is
    // enforced just-in-time before the stealth branch runs inside handleClaim.
    setHeader({ backUrl: '/member/dashboard' })
    Promise.all([fetchChainAssets(), fetchChains(), loadAddressSuggestions(), loadSummary()])
    return () => clearHeader()
  }, [])

  // Detect whether the selected chain has privacy_deposit items pending — drives the
  // password field visibility.
  useEffect(() => {
    let cancelled = false
    if (!selectedChain) { setChainHasPrivacy(false); return }
    apis.transaction
      .getMyPayrollItems({ status: 'claimable', caipChainId: selectedChain, walletToken, page: 1, pageSize: 100 })
      .then(data => {
        if (cancelled) return
        setChainHasPrivacy((data.data ?? []).some(i => i.transactionType === 'privacy_deposit' && i.withdrawData))
      })
      .catch(() => { if (!cancelled) setChainHasPrivacy(false) })
    return () => { cancelled = true }
  }, [selectedChain, walletToken])

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
      const data = await apis.transaction.getMySummary()
      const tokens: PendingToken[] = data.pendingClaim.map(item => ({
        tokenAddress: item.tokenAddress,
        caipChainId: item.caipChainId,
        symbol: getTokenSymbol(item.caipChainId, item.tokenAddress) ?? item.tokenAddress.slice(0, 6),
        amount: Number(item.totalAmount) / Math.pow(10, getTokenDecimals(item.caipChainId, item.tokenAddress)),
        iconUrl: getTokenIconUrl(item.caipChainId, item.tokenAddress),
      }))
      setAllPending(tokens)
      if (tokens.length > 0 && !selectedChain) setSelectedChain(tokens[0].caipChainId)
    } catch {
      // request interceptor handles API errors
    } finally {
      setSummaryLoading(false)
    }
  }

  // Fetch all claimable payroll items for a chain (paginate through all pages).
  const fetchAllClaimable = async (caipChainId: string): Promise<StealthPayrollItem[]> => {
    const PAGE_SIZE = 100
    let page = 1
    const items: StealthPayrollItem[] = []
    while (true) {
      const data = await apis.transaction.getMyPayrollItems({
        status: 'claimable',
        caipChainId,
        walletToken,
        page,
        pageSize: PAGE_SIZE,
      })
      items.push(...(data.data ?? []))
      if (items.length >= (data.total ?? 0)) break
      page++
    }
    return items
  }

  // ── Stealth claim branch (existing flow): derive stealth keys, EIP-712 sign, batchClaim ──
  const runStealthClaim = async (
    items: StealthPayrollItem[],
    selectedChainIdNum: number,
  ): Promise<BatchClaimResponse> => {
    const chainList = await apis.chainAsset.getChains()
    const caipToChain: Record<string, { chainIdNum: number; vaultAddress: string }> = {}
    for (const chain of chainList) {
      if (chain.vaultAddress) {
        caipToChain[chain.caipChainId] = {
          chainIdNum: parseInt(chain.chainId, 10),
          vaultAddress: chain.vaultAddress,
        }
      }
    }

    const metaPrivKeyBytes = await deriveMetaPrivKey(walletProvider!, address!)
    const deadline = Math.floor(Date.now() / 1000) + 3600

    const signedItems: {
      payrollItemId: string
      recipient: string
      deadline: number
      nonce: string
      signature: string
    }[] = []
    const skipped: string[] = []

    try {
      const selectedChainInfo = caipToChain[selectedChain]
      if (!selectedChainInfo) {
        throw new Error(`Vault contract is not configured for chain ${selectedChain}.`)
      }

      const publicClient = createPublicClient({
        chain: {
          id: selectedChainIdNum,
          name: chains.find(chain => chain.caipChainId === selectedChain)?.name ?? selectedChain,
          nativeCurrency: { name: 'Native Token', symbol: 'NATIVE', decimals: 18 },
          rpcUrls: { default: { http: [] }, public: { http: [] } },
        } as any,
        transport: custom(walletProvider!),
      })
      const nextNonceByStealth = new Map<string, bigint>()

      for (const item of items) {
        let stealthPrivHex: string | null = null
        let stealthAccount: ReturnType<typeof privateKeyToAccount> | null = null
        try {
          stealthPrivHex = recoverStealthPrivateKey(ethers.hexlify(metaPrivKeyBytes), item.batch.ephemeralPub)
          stealthAccount = privateKeyToAccount(stealthPrivHex as `0x${string}`)

          if (stealthAccount.address.toLowerCase() !== item.stealthAddress.toLowerCase()) {
            skipped.push(item.id)
            continue
          }

          const chainInfo = caipToChain[item.batch.caipChainId]
          if (!chainInfo) { skipped.push(item.id); continue }

          const stealthKey = stealthAccount.address.toLowerCase()
          let nonce = nextNonceByStealth.get(stealthKey)
          if (nonce === undefined) {
            const claimedData = await publicClient.readContract({
              address: chainInfo.vaultAddress as Hex,
              abi: vaultAbi,
              functionName: 'claimed',
              args: [stealthAccount.address as Hex],
            })
            nonce = claimedData[1]
          }

          const domain = {
            name: 'StealthPay',
            version: '1',
            chainId: chainInfo.chainIdNum,
            verifyingContract: chainInfo.vaultAddress as `0x${string}`,
          } as const

          const types = {
            ClaimRequest: [
              { name: 'stealthAddress', type: 'address' },
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'recipient', type: 'address' },
              { name: 'deadline', type: 'uint256' },
              { name: 'expectedAmount', type: 'uint256' },
              { name: 'nonce', type: 'uint256' },
            ],
          } as const

          const message = {
            stealthAddress: stealthAccount.address as `0x${string}`,
            token: item.batch.tokenAddress as `0x${string}`,
            amount: BigInt(item.amount),
            recipient: trimmedRecipient as `0x${string}`,
            deadline: BigInt(deadline),
            expectedAmount: BigInt(item.amount),
            nonce,
          } as const

          const signature = await stealthAccount.signTypedData({ domain, types, primaryType: 'ClaimRequest', message })
          signedItems.push({
            payrollItemId: item.id,
            recipient: trimmedRecipient,
            deadline,
            nonce: nonce.toString(),
            signature,
          })
          nextNonceByStealth.set(stealthKey, nonce + 1n)
        } catch {
          skipped.push(item.id)
        } finally {
          stealthPrivHex = null
          stealthAccount = null
        }
      }
    } finally {
      metaPrivKeyBytes.fill(0)
    }

    if (signedItems.length === 0) {
      return {
        succeeded: [],
        failed: skipped.map(id => ({ payrollItemId: id, reason: t('pages.memberClaim.nothingToClaimTitle') })),
      }
    }
    const confirmMessage = `I confirm that the recipient address for this claim is:\n${trimmedRecipient}`
    const recipientSignature = await walletProvider!.request<string>({
      method: 'personal_sign',
      params: [confirmMessage, address!],
    }) as string

    return apis.transaction.batchClaim({ items: signedItems, recipientSignature })
  }

  // ── Privacy withdraw branch: decrypt → ZK proof → on-chain withdraw → confirm-withdraw ──
  const runPrivacyWithdraw = async (
    items: StealthPayrollItem[],
    chainIdNum: number,
    chainName: string,
    explorerUrl: string | null,
  ): Promise<BatchClaimResponse> => {
    const succeeded: BatchClaimResponse['succeeded'] = []
    const failed: BatchClaimResponse['failed'] = []

    let keyPair = cachedKeyPairRef.current
    if (!keyPair) {
      const walletClient = createWalletClient({ account: address! as Hex, transport: custom(walletProvider!) })
      keyPair = await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])
      if (rememberKey) cachedKeyPairRef.current = keyPair
    }

    // When delegating, resolve the platform relayer address + chain-level withdrawRelayerSupported.
    let relayerAddress = relayerAddressRef.current
    let withdrawRelayerSupported = true
    if (delegateToServer) {
      const caipChainId = `eip155:${chainIdNum}`
      const rel = await apis.transaction.getPrivacyWithdrawRelayer(caipChainId)
      relayerAddress = rel.relayerAddress
      withdrawRelayerSupported = rel.withdrawRelayerSupported
      relayerAddressRef.current = relayerAddress
      // 链不支持平台代付 withdraw 时强制直发（后端 relay-withdraw 也会拒绝）
      if (!withdrawRelayerSupported) setDelegateToServer(false)
    }
    const effectiveDelegate = delegateToServer && withdrawRelayerSupported

    for (const item of items) {
      try {
        const res = await withdrawPrivacyItem({
          item,
          recipient: trimmedRecipient,
          keyPair,
          walletProvider: walletProvider!,
          account: address!,
          chainIdNum,
          chainName,
          delegate: effectiveDelegate,
          relayerAddress: effectiveDelegate ? relayerAddress : undefined,
          onStatus: msg => setPrivacyStatus(`${item.transactionName ?? item.id}: ${msg}`),
        })
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
      open({ view: 'Connect', namespace: 'eip155' })
      userAction.current = true
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

      const privacyItems = items.filter(i => i.transactionType === 'privacy_deposit' && i.withdrawData)
      const stealthItems = items.filter(i => i.transactionType !== 'privacy_deposit')

      // Privacy withdrawals need a password to unlock the encrypted Secret.
      if (privacyItems.length > 0 && !password && !cachedKeyPairRef.current) {
        toast({ description: t('pages.memberClaim.enterPasswordToast'), variant: 'destructive' })
        return
      }

      const chainEntry = chains.find(c => c.caipChainId === selectedChain)
      if (!chainEntry?.chainId) throw new Error(`Chain ${selectedChain} is not configured.`)
      const chainIdNum = parseInt(chainEntry.chainId, 10)
      const explorerUrl = chainEntry.explorerUrls?.[0] ?? null

      // Switch the wallet to the target chain once, up-front, for both branches.
      const currentChainIdHex = await walletProvider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== chainIdNum) {
        await walletProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainIdNum.toString(16)}` }],
        })
      }

      const succeeded: BatchClaimResponse['succeeded'] = []
      const failed: BatchClaimResponse['failed'] = []

      // Run privacy withdrawals first (direct on-chain), then stealth batch claim.
      if (privacyItems.length > 0) {
        const r = await runPrivacyWithdraw(privacyItems, chainIdNum, chainEntry.name, explorerUrl)
        succeeded.push(...r.succeeded)
        failed.push(...r.failed)
      }

      if (stealthItems.length > 0) {
        if (!walletToken) {
          for (const it of stealthItems) {
            failed.push({ payrollItemId: it.id, reason: t('pages.memberClaim.unauthorizedTitle') })
          }
        } else {
          const r = await runStealthClaim(stealthItems, chainIdNum)
          succeeded.push(...r.succeeded)
          failed.push(...r.failed)
        }
      }

      setClaimResult({ succeeded, failed })
      await Promise.all([loadSummary(), loadAddressSuggestions()])
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
                    onClick={() => { setSelectedChain(chain.caipChainId); setDropdownOpen(false) }}
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
            ) : pendingForChain.length === 0 ? (
              <p className="text-[14px] leading-[22px] text-[#8d8d93] py-[4px]">
                {selectedChain ? t('pages.memberClaim.noPendingForNetwork') : t('pages.memberClaim.selectNetworkToView')}
              </p>
            ) : (
              pendingForChain.map(token => (
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
              ))
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
              onChange={e => { setPassword(e.target.value); cachedKeyPairRef.current = null }}
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
            <label className="flex cursor-pointer select-none items-center gap-[8px]">
              <input
                type="checkbox"
                checked={delegateToServer}
                onChange={e => setDelegateToServer(e.target.checked)}
                className="size-[16px] cursor-pointer accent-[#5e85ee]"
              />
              <span className="text-[13px] leading-[20px] text-[#606067]">{t('pages.memberClaim.delegateToServer')}</span>
            </label>
            <p className="text-[13px] leading-[20px] text-[#8d8d93]">
              {delegateToServer ? t('pages.memberClaim.delegateToServerHelp') : t('pages.memberClaim.privacyWithdrawHelp')}
            </p>
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
              || pendingForChain.length === 0
              || (chainHasPrivacy && !password && !cachedKeyPairRef.current)
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
