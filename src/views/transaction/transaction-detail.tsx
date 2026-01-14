import apis from '@/apis'
import { SafeWalletApi } from '@/apis/safe-wallet.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Provider, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import Safe from '@safe-global/protocol-kit'
import type { SafeMultisigTransactionResponse } from '@safe-global/types-kit'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

function formatEther(value?: string) {
	return value ? (() => {
		try {
			const v = BigInt(value)
			const ether = Number(v) / 1e18
			return ether.toString()
		} catch {
			return value
		}
	})() : '-'
}

function getTransactionStatus(tx: SafeMultisigTransactionResponse | null): 'ready' | 'pending' | 'complete' | 'failed' | 'draft' {
	if (!tx) return 'draft'

	if (tx.isExecuted) return 'complete'

	const confirmationsCount = tx.confirmations ? tx.confirmations.length : 0
	const requiredConfirmations = tx.confirmationsRequired ?? 0

	if (confirmationsCount >= requiredConfirmations) return 'ready'

	return 'pending'
}

export default function TransactionDetail() {
	const { chainId, safeTxHash } = useParams<{ chainId: string; safeTxHash: string }>()
	const [tx, setTx] = useState<SafeMultisigTransactionResponse | null>(null)
	const [loading, setLoading] = useState<boolean>(false)
	const { toast } = useToast()
	const { walletProvider } = useAppKitProvider<Provider>("eip155")
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()

	const chainIdBigInt = chainId ? BigInt(chainId) : 1n

	// Refresh transaction details
	const refreshTx = useCallback(async () => {
		if (!safeTxHash) return
		const api = new SafeWalletApi(chainIdBigInt)
		const updated = await api.getTransaction(safeTxHash)
		setTx(updated as SafeMultisigTransactionResponse)
	}, [safeTxHash, chainIdBigInt])

	useEffect(() => {
		if (!safeTxHash) return
		setLoading(true)
		const api = new SafeWalletApi(chainIdBigInt)
		api
			.getTransaction(safeTxHash)
			.then((res: any) => {
				setTx(res as SafeMultisigTransactionResponse)
			})
			.finally(() => setLoading(false))
	}, [safeTxHash])

	// Polling for transaction updates every second
	useEffect(() => {
		if (!safeTxHash) return

		const interval = setInterval(() => {
			refreshTx()
		}, 1000)

		return () => clearInterval(interval)
	}, [safeTxHash, refreshTx])

	if (loading) {
		return <div className="p-6">Loading...</div>
	}

	if (!tx) {
		return <div className="p-6">Transaction details not found</div>
	}

	const confirmationsCount = tx.confirmations ? tx.confirmations.length : 0
	const requiredConfirmations = tx.confirmationsRequired ?? 0
	const showExecute = !tx.isExecuted && confirmationsCount >= requiredConfirmations
	const showConfirm = !tx.isExecuted && confirmationsCount < requiredConfirmations

	const ConnectWallet = ()=>{
		open({ view: 'Connect', namespace: 'eip155' })
		return null
	}

	const handleConfirm = async () => {
		if (!tx) return
		if (!walletProvider) {
			toast({ description: 'Cannot find web3 provider', variant: 'destructive' })
			return
		}

		const provider = walletProvider
		try {
			// 尝试切换网络
			const hexChainId = '0x' + Number(chainId ?? 1).toString(16)
			await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
		} catch (e) {
			// ignore
		}

		try {
			const protocolKit = await Safe.init({
				provider,
				safeAddress: tx.safe,
			})

			const signatureResp = await protocolKit.signHash(tx.safeTxHash)
			const signature = signatureResp.data

			await apis.transaction.confirmTransaction(tx.safeTxHash, { signature })

			toast({ description: 'Confirmation submitted', variant: 'default' })
			await refreshTx()
		} catch (error: any) {
			console.error(error)
			toast({ description: `Error: ${error?.message || error}`, variant: 'destructive' })
		}
	}

	const handleExecute = async () => {
		if (!tx) return
		if (!walletProvider) {
			toast({ description: 'Cannot find web3 provider', variant: 'destructive' })
			return
		}

		const provider = walletProvider
		try {
			const hexChainId = '0x' + Number(chainId ?? 1).toString(16)
			await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
		} catch (e) {
			// ignore
		}

		try {
			const protocolKit = await Safe.init({
				provider,
				safeAddress: tx.safe,
			})

			await protocolKit.executeTransaction(tx)

			toast({ description: 'Transaction execution sent', variant: 'default' })
			await refreshTx()
		} catch (error: any) {
			console.error(error)
			toast({ description: `Execution failed: ${error?.message || error}`, variant: 'destructive' })
		}
	}

	return (
		<div className="p-6">
			<div className="mb-6 rounded-md bg-green-50 p-4">
				<div className="flex items-center justify-between">
					<div className="text-lg font-semibold">Transaction details</div>
					<Badge variant={getTransactionStatus(tx) === 'complete' ? 'default' : getTransactionStatus(tx) === 'ready' ? 'secondary' : getTransactionStatus(tx) === 'failed' ? 'destructive' : 'outline'}>
						{getTransactionStatus(tx)}
					</Badge>
				</div>
			</div>

			<div className="mb-4 rounded-md bg-white p-6 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<div className="text-sm text-gray-500">Interacted with</div>
						<div className="font-medium font-mono">{tx.to}</div>
					</div>
					<div className="text-right">
						<div className="text-sm text-gray-500">Value</div>
						<div className="font-medium">ETH {formatEther(tx.value)}</div>
					</div>
				</div>

				<table className="w-full table-fixed text-left">
					<tbody>
						<tr>
							<td className="w-40 py-2 text-gray-600">To</td>
							<td className="py-2 font-mono">
								<div className="max-w-xs truncate font-mono">
									{tx.to}
								</div>
							</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">Value</td>
							<td className="py-2 font-mono">{tx.value}</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">Data</td>
							<td className="py-2 font-mono">
								<div className="max-w-xs truncate font-mono">
									{tx.data ?? '0x'}
								</div>
							</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">Operation</td>
							<td className="py-2 font-mono">{tx.operation} (0 = call)</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">SafeTxGas</td>
							<td className="py-2 font-mono">{tx.safeTxGas}</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">BaseGas</td>
							<td className="py-2 font-mono">{tx.baseGas}</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">GasPrice</td>
							<td className="py-2 font-mono">{tx.gasPrice}</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">GasToken</td>
							<td className="py-2">
								<div className="max-w-xs truncate font-mono">
									{tx.gasToken}
								</div>
							</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">RefundReceiver</td>
							<td className="py-2">
								<div className="max-w-xs truncate font-mono">
									{tx.refundReceiver ?? '-'}
								</div>
							</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">Nonce</td>
							<td className="py-2 font-mono">{tx.nonce}</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">Signatures</td>
							<td className="py-2">
								<div className="max-w-xs truncate font-mono">
									{tx.signatures ?? '-'}
								</div>
							</td>
						</tr>
						<tr>
							<td className="py-2 text-gray-600">Confirmations</td>
							<td className="py-2 font-mono">
								{confirmationsCount} / {requiredConfirmations}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			{/* 右下角按钮：根据详情字段决定显示 Confirm / Execute */}
			<div className="fixed right-6 bottom-6 flex gap-3">
				{!isConnected && <Button onClick={ConnectWallet}>Connect Wallet</Button>}
				{isConnected && showConfirm && <Button onClick={handleConfirm}>Confirm</Button>}
				{isConnected && showExecute && <Button onClick={handleExecute}>Execute</Button>}
			</div>
		</div>
	)
}


