import apis from '@/apis'
import type { DefiRecipientOption, PrivacyPayrollItem } from '@/apis/transaction.api'
import type { NetworkConfigResponse } from '@/apis/chain-asset.api'
import { getDefiAdapter } from '@/lib/gravarc/defi/registry'
import type { DefiQuote } from '@/lib/gravarc/defi/types'
import { routePrivateAllocation } from '@/lib/gravarc/defi/directRouting'
import {
  assertRedepositReceipt,
  attachRedepositHash,
  deliverRedeposit,
  loadPreparedRedeposits,
  waitForIndexedDelivery,
  type PreparedRedeposit
} from '@/lib/gravarc/defi/preparedRedeposit'
import { defiAllocationItem } from '@/lib/gravarc/defi/allocationItem'
import type { ReceiverInput } from '@/lib/gravarc/depositProofBrowser'
import { deriveNaclKeyPair } from '@/lib/gravarc/naclCrypto'
import { readPrivacyWithdrawState } from '@/lib/gravarc/privacyWithdraw'
import { selectWalletNetwork } from '@/providers/app-kit-provider'
import { usePrivacyUnlock } from '@/providers/privacy-unlock-provider'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useEffect, useMemo, useState } from 'react'
import { formatUnits, getAddress, parseUnits, createPublicClient, createWalletClient, custom, type Hex } from 'viem'

async function allClaimableItems(networks: NetworkConfigResponse[]): Promise<PrivacyPayrollItem[]> {
  const items: PrivacyPayrollItem[] = []
  for (let page = 1; ; page++) {
    const result = await apis.transaction.getMyPayrollItems({ status: 'claimable', page, pageSize: 100 })
    items.push(...result.data.filter(item => item.transactionType === 'privacy_deposit' && item.withdrawData))
    if (page * 100 >= result.total) break
  }
  const allocations = await apis.transaction.getMyDefiAllocations()
  for (const allocation of allocations) {
    const network = networks.find(entry => entry.caipChainId === allocation.caipChainId)
    if (network) items.push(defiAllocationItem(allocation, network))
  }
  return items
}

export default function MemberDefi() {
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const { rememberKey, setRememberKey, cachedKeyPair, cacheKeyPair } = usePrivacyUnlock()
  const [networks, setNetworks] = useState<NetworkConfigResponse[]>([])
  const [items, setItems] = useState<PrivacyPayrollItem[]>([])
  const [itemId, setItemId] = useState('')
  const [protocolAddress, setProtocolAddress] = useState('')
  const [outputToken, setOutputToken] = useState('')
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [redeposit, setRedeposit] = useState(false)
  const [recipientOptions, setRecipientOptions] = useState<DefiRecipientOption[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(true)
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [recipientAmounts, setRecipientAmounts] = useState<Record<string, string>>({})
  const [excessRecipient, setExcessRecipient] = useState('')
  const [pending, setPending] = useState<PreparedRedeposit[]>([])
  const [recoveryHashes, setRecoveryHashes] = useState<Record<string, string>>({})
  const [password, setPassword] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [balance, setBalance] = useState<Awaited<ReturnType<typeof readPrivacyWithdrawState>> | null>(null)
  const [quote, setQuote] = useState<DefiQuote | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    void apis.chainAsset
      .getNetworks()
      .then(async configured => {
        setNetworks(configured)
        setItems(await allClaimableItems(configured))
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load DeFi allocations'))
  }, [])
  useEffect(() => {
    const orgId = localStorage.getItem('organizationId')
    if (!orgId) {
      setRecipientsLoading(false)
      setError('Select an organization before choosing re-deposit receivers')
      return
    }
    void apis.transaction
      .getDefiRecipientOptions(orgId)
      .then(setRecipientOptions)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load re-deposit receivers'))
      .finally(() => setRecipientsLoading(false))
  }, [])
  useEffect(() => {
    setBalance(null)
    setQuote(null)
    setPassword('')
    setTxHash('')
    try {
      setPending(address ? loadPreparedRedeposits(address) : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read saved DeFi delivery')
    }
  }, [address])
  useEffect(() => {
    setBalance(null)
    setQuote(null)
    setProtocolAddress('')
    setOutputToken('')
    setAmount('')
  }, [itemId])
  useEffect(() => {
    setQuote(null)
  }, [protocolAddress, outputToken, amount, slippage, destination, redeposit, selectedRecipients, recipientAmounts, excessRecipient])

  const item = items.find(row => row.id === itemId)
  const network = networks.find(row => row.caipChainId === item?.batch.caipChainId)
  const protocol = network?.protocols.find(row => row.address === protocolAddress)
  const inputToken = network?.tokens.find(
    row => row.address.toLowerCase() === (item?.tokenAddress || item?.batch.tokenAddress)?.toLowerCase()
  )
  const output = network?.tokens.find(row => row.address === outputToken)
  const supportedProtocols = useMemo(
    () =>
      network?.protocols.filter(row => {
        try {
          return Boolean(getDefiAdapter(row as Parameters<typeof getDefiAdapter>[0]))
        } catch {
          return false
        }
      }) ?? [],
    [network]
  )

  async function unlock() {
    if (!item || !network || !address || !walletProvider)
      throw new Error('Connect the wallet owning the selected allocation')
    await selectWalletNetwork(network.chainId)
    const walletChain = await walletProvider.request<string>({ method: 'eth_chainId' })
    if (Number.parseInt(walletChain, 16) !== network.chainId) throw new Error('Wallet did not switch networks')
    let keyPair = cachedKeyPair
    if (!keyPair) {
      if (!password) throw new Error('Enter your privacy password')
      const walletClient = createWalletClient({ account: getAddress(address), transport: custom(walletProvider) })
      keyPair = await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])
    }
    const liveBalance = await readPrivacyWithdrawState(item, keyPair, walletProvider)
    if (rememberKey) cacheKeyPair(keyPair)
    setBalance(liveBalance)
    return keyPair
  }

  function requestedAmount(): { amountIn: bigint; slippageBips: bigint } {
    if (!inputToken) throw new Error('Input token is not configured')
    const amountIn = parseUnits(amount, inputToken.decimals)
    const slippageBips = parseUnits(slippage, 2)
    if (amountIn <= 0n || slippageBips < 0n || slippageBips >= 10_000n)
      throw new Error('Enter a positive amount and valid slippage')
    if (!balance || amountIn > balance.remaining)
      throw new Error('Check the live balance and select no more than the remainder')
    return { amountIn, slippageBips }
  }

  async function preview() {
    if (!network || !protocol || !item || !output || !walletProvider)
      throw new Error('Select an allocation, route, output token, and wallet')
    await selectWalletNetwork(network.chainId)
    const walletChain = await walletProvider.request<string>({ method: 'eth_chainId' })
    if (Number.parseInt(walletChain, 16) !== network.chainId)
      throw new Error('Wallet did not switch to the selected network')
    const { amountIn, slippageBips } = requestedAmount()
    const adapter = getDefiAdapter(protocol as Parameters<typeof getDefiAdapter>[0])
    if (
      !adapter.supportsNativeAssets &&
      (inputToken?.address.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
        output.address.toLowerCase() === '0x0000000000000000000000000000000000000000')
    ) {
      throw new Error('This route supports ERC-20 tokens only')
    }
    setQuote(
      await adapter.quote({
        chainId: network.chainId,
        family: 'evm',
        walletProvider,
        protocol: protocol as Parameters<typeof getDefiAdapter>[0],
        inputToken: getAddress(item.tokenAddress || item.batch.tokenAddress),
        outputToken: getAddress(output.address),
        amountIn,
        inputDecimals: inputToken!.decimals,
        outputDecimals: output.decimals,
        slippageBips
      })
    )
  }

  async function privateReceivers(): Promise<ReceiverInput[]> {
    if (!output) throw new Error('Select an output token')
    if (selectedRecipients.size < 1 || selectedRecipients.size > 128) {
      throw new Error('Select 1–128 re-deposit receivers')
    }
    const parsed = Array.from(selectedRecipients).map(memberId => {
      const recipient = recipientOptions.find(option => option.memberId === memberId)
      if (!recipient) throw new Error('A selected receiver is no longer available')
      const amountText = recipientAmounts[memberId] ?? ''
      if (!amountText) throw new Error(`Enter an amount for ${recipient.showName}`)
      const amount = parseUnits(amountText, output.decimals)
      if (amount <= 0n) throw new Error('Each receiver needs a positive amount')
      return { address: getAddress(recipient.address), amount }
    })
    const profiles = await apis.transaction.getDefiRecipientProfiles(parsed.map(row => row.address))
    const byAddress = new Map(profiles.map(profile => [profile.address.toLowerCase(), profile]))
    return parsed.map(row => {
      const profile = byAddress.get(row.address.toLowerCase())
      if (!profile) throw new Error(`Receiver ${row.address} has no current EVM privacy profile`)
      return { address: row.address, amount: row.amount, secretHash: profile.secretHash, encPubkey: profile.encPubkey }
    })
  }

  function toggleRecipient(memberId: string) {
    setSelectedRecipients(current => {
      const next = new Set(current)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  function setRecipientAmount(memberId: string, value: string) {
    if (value !== '' && !/^\d*(\.\d*)?$/.test(value)) return
    setRecipientAmounts(current => ({ ...current, [memberId]: value }))
  }

  async function retryDelivery(record: PreparedRedeposit) {
    const recoveryNetwork = networks.find(entry => entry.caipChainId === record.caipChainId)
    if (!address || !walletProvider || !recoveryNetwork)
      throw new Error('Connect the original sender wallet on a configured network')
    if (record.sender.toLowerCase() !== address.toLowerCase()) throw new Error('Connect the original sender wallet')
    await selectWalletNetwork(recoveryNetwork.chainId)
    const walletChain = await walletProvider.request<string>({ method: 'eth_chainId' })
    if (Number.parseInt(walletChain, 16) !== recoveryNetwork.chainId)
      throw new Error('Wallet did not switch to the recovery network')
    const hash = record.txHash ?? recoveryHashes[record.id]
    if (!hash) throw new Error('Enter the DeFi transaction hash to recover delivery')
    const attached = attachRedepositHash(record, hash)
    const client = createPublicClient({ transport: custom(walletProvider) })
    const receipt = await client.waitForTransactionReceipt({ hash: attached.txHash as Hex })
    const leaf = assertRedepositReceipt(
      attached,
      receipt,
      recoveryNetwork.contracts.gravArc,
      recoveryNetwork.contracts.defiRouter
    )
    await waitForIndexedDelivery(
      () => deliverRedeposit(attached, leaf),
      () => setStatus('Transaction confirmed. Waiting for deposit indexing and encrypted delivery…')
    )
    setPending(loadPreparedRedeposits(address))
    setItems(await allClaimableItems(networks))
  }

  async function run(action: 'balance' | 'quote' | 'execute') {
    setBusy(true)
    setError('')
    setStatus('')
    setTxHash('')
    try {
      if (action === 'balance') {
        await unlock()
        return
      }
      if (action === 'quote') {
        await preview()
        return
      }
      if (!item || !network || !protocol || !output || !quote || !walletProvider || !address)
        throw new Error('Preview a fresh route first')
      if (quote.expiresAt <= Date.now()) throw new Error('Quote expired; preview again')
      const { amountIn, slippageBips } = requestedAmount()
      const keyPair = await unlock()
      const receivers = redeposit ? await privateReceivers() : undefined
      const result = await routePrivateAllocation({
        item,
        network,
        protocol: protocol as Parameters<typeof getDefiAdapter>[0],
        outputToken: getAddress(output.address),
        amountIn,
        slippageBips,
        destination: redeposit ? getAddress(network.contracts.pureRouter) : getAddress(destination),
        displayedQuote: quote,
        keyPair,
        walletProvider,
        account: getAddress(address),
        redeposit: receivers ? { receivers, excessRecipient: getAddress(excessRecipient || address) } : undefined,
        confirmQuoteChange: fresh =>
          window.confirm(
            `Quote changed. New minimum: ${formatUnits(fresh.minimumOutput, output.decimals)} ${output.symbol}. Continue?`
          ),
        onStatus: setStatus
      })
      setTxHash(result.txHash)
      setQuote(null)
      setBalance(null)
      setPending(loadPreparedRedeposits(address))
      setStatus(
        result.deliveryPending
          ? 'Confirmed on-chain. Encrypted delivery is pending; retry it below before another re-deposit.'
          : 'Confirmed on-chain. Refresh the live balance before another operation.'
      )
      if (redeposit && !result.deliveryPending) {
        void allClaimableItems(networks)
          .then(setItems)
          .catch(() => undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DeFi operation failed')
      if (address) {
        try {
          setPending(loadPreparedRedeposits(address))
        } catch {
          /* preserve the original error */
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-2xl font-semibold">Private DeFi</h1>
      <p>
        Swap one of your private allocations directly from your wallet, or privately re-deposit the output. Only the
        sending wallet pays gas.
      </p>
      <label className="block">
        Allocation
        <select
          className="block w-full rounded border p-2"
          value={itemId}
          disabled={busy}
          onChange={event => setItemId(event.target.value)}
        >
          <option value="">Select an allocation</option>
          {items.map(row => (
            <option key={row.id} value={row.id}>
              {row.transactionName ?? row.id} · {row.batch.caipChainId}
            </option>
          ))}
        </select>
      </label>
      {item && (
        <>
          <label className="block">
            Privacy password
            <input
              className="block w-full rounded border p-2"
              type="password"
              value={password}
              disabled={busy || Boolean(cachedKeyPair)}
              onChange={event => setPassword(event.target.value)}
              placeholder={cachedKeyPair ? 'Unlocked in this tab' : ''}
            />
          </label>
          <label className="flex gap-2">
            <input type="checkbox" checked={rememberKey} onChange={event => setRememberKey(event.target.checked)} />{' '}
            Remember unlock in this tab
          </label>
          <button className="rounded border px-4 py-2" disabled={busy} onClick={() => void run('balance')}>
            Check live balance
          </button>
          {balance && (
            <p>
              Available: {formatUnits(balance.remaining, inputToken?.decimals ?? 18)} {inputToken?.symbol}; claimed:{' '}
              {formatUnits(balance.claimed, inputToken?.decimals ?? 18)}
            </p>
          )}
          <label className="block">
            Protocol
            <select
              className="block w-full rounded border p-2"
              value={protocolAddress}
              disabled={busy}
              onChange={event => setProtocolAddress(event.target.value)}
            >
              <option value="">Select a route</option>
              {supportedProtocols.map(row => (
                <option key={row.address} value={row.address}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Output token
            <select
              className="block w-full rounded border p-2"
              value={outputToken}
              disabled={busy}
              onChange={event => setOutputToken(event.target.value)}
            >
              <option value="">Select a token</option>
              {network?.tokens
                .filter(row => row.address.toLowerCase() !== inputToken?.address.toLowerCase())
                .map(row => (
                  <option key={row.address} value={row.address}>
                    {row.symbol}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            Amount to swap
            <input
              className="block w-full rounded border p-2"
              value={amount}
              disabled={busy}
              onChange={event => setAmount(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={redeposit}
              disabled={busy}
              onChange={event => setRedeposit(event.target.checked)}
            />{' '}
            Private re-deposit
          </label>
          {redeposit ? (
            <>
              <fieldset className="space-y-2 rounded border p-3" disabled={busy || recipientsLoading}>
                <legend className="px-1">WhiteList receivers and private amounts</legend>
                {recipientsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading eligible receivers…</p>
                ) : recipientOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active WhiteList member has a current EVM privacy profile.
                  </p>
                ) : (
                  recipientOptions.map(recipient => {
                    const selected = selectedRecipients.has(recipient.memberId)
                    return (
                      <div key={recipient.memberId} className="flex flex-col gap-2 rounded border p-2 sm:flex-row sm:items-center">
                        <label className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleRecipient(recipient.memberId)}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{recipient.showName}</span>
                            <span className="block truncate text-xs text-muted-foreground">{recipient.address}</span>
                          </span>
                        </label>
                        {selected && (
                          <input
                            className="rounded border p-2 sm:w-40"
                            value={recipientAmounts[recipient.memberId] ?? ''}
                            onChange={event => setRecipientAmount(recipient.memberId, event.target.value)}
                            inputMode="decimal"
                            placeholder={output ? `Amount in ${output.symbol}` : 'Amount'}
                            aria-label={`Amount for ${recipient.showName}`}
                          />
                        )}
                      </div>
                    )
                  })
                )}
              </fieldset>
              {protocol?.outputBehavior === 'variable' && (
                <label className="block">
                  Send excess output to
                  <input
                    className="block w-full rounded border p-2"
                    value={excessRecipient}
                    disabled={busy}
                    onChange={event => setExcessRecipient(event.target.value)}
                    placeholder={address ?? '0x…'}
                  />
                </label>
              )}
              <p>Re-deposits are non-refundable. Encrypted recovery is saved in this browser before wallet signing.</p>
            </>
          ) : (
            <label className="block">
              Destination wallet
              <input
                className="block w-full rounded border p-2"
                value={destination}
                disabled={busy}
                onChange={event => setDestination(event.target.value)}
                placeholder="0x…"
              />
                <span className="mt-1 block text-xs text-muted-foreground">
                  For better privacy, do not use the deposit address or another address publicly associated with you.
                </span>
            </label>
          )}
          <label className="block">
            Maximum slippage (%)
            <input
              className="block w-full rounded border p-2"
              value={slippage}
              disabled={busy}
              onChange={event => setSlippage(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <button
            className="rounded border px-4 py-2"
            disabled={busy || !balance || !protocol || !output}
            onClick={() => void run('quote')}
          >
            Refresh quote
          </button>
          {quote && (
            <p>
              Expected: {formatUnits(quote.estimatedOutput, output?.decimals ?? 18)} {output?.symbol}; minimum:{' '}
              {formatUnits(quote.minimumOutput, output?.decimals ?? 18)}. {quote.routeLabel}
            </p>
          )}
          <button
            className="bg-primary text-primary-foreground rounded px-4 py-2"
            disabled={busy || !quote || quote.expiresAt <= Date.now()}
            onClick={() => void run('execute')}
          >
            {redeposit ? 'Swap and re-deposit' : 'Swap directly'}
          </button>
        </>
      )}
      {pending.length > 0 && (
        <section className="space-y-3 rounded border p-4">
          <h2 className="font-semibold">Pending encrypted delivery</h2>
          {pending.map(record => (
            <div key={record.id} className="space-y-2 border-t pt-2">
              <p>
                {record.caipChainId} · deposit leaf {record.depositLeaf.slice(0, 14)}…
              </p>
              {!record.txHash && (
                <input
                  className="w-full rounded border p-2"
                  value={recoveryHashes[record.id] ?? ''}
                  onChange={event => setRecoveryHashes(old => ({ ...old, [record.id]: event.target.value }))}
                  placeholder="Paste the submitted DeFi transaction hash"
                />
              )}
              <button
                className="rounded border px-3 py-1"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  setError('')
                  setStatus('Confirming encrypted delivery…')
                  void retryDelivery(record)
                    .then(() => setStatus('Encrypted delivery confirmed'))
                    .catch(err => setError(err instanceof Error ? err.message : 'Delivery retry failed'))
                    .finally(() => setBusy(false))
                }}
              >
                Retry delivery
              </button>
            </div>
          ))}
        </section>
      )}
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      )}
      {txHash && <p>Confirmed transaction: {txHash}</p>}
    </div>
  )
}
