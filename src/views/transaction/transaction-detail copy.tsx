import apis from '@/apis'
import type { TransactionCheckResponse } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Provider, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import Safe from '@safe-global/protocol-kit'
import type { MetaTransactionData, SafeSignature, SafeTransaction } from '@safe-global/types-kit'
import { ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

interface ChainAsset {
	id: string
	caipChainId: string
	assetId: string
	contractAddress: string
	decimals: number
	isNative: boolean
	status: string
	createdAt: string
	updatedAt: string
	chain: {
		id: string
		caipChainId: string
		name: string
		chainId: string
		ecosystem: string
		iconUrl: string
		rpcUrls: string[]
		explorerUrls: string[]
		status: string
		createdAt: string
		updatedAt: string
	}
	asset: {
		id: string
		symbol: string
		name: string
		iconUrl: string
		isStable: boolean
		status: string
		createdAt: string
		updatedAt: string
	}
}

// 获取区块链浏览器 URL - 使用 chain.chainId
function getExplorerUrl(chainId: string, type: 'tx' | 'address' | 'block', value: string | number): string {
	const chainIdNum = Number(chainId)

	let baseUrl = ''
	// 根据链 ID 选择浏览器
	switch (chainIdNum) {
		case 1: // Ethereum Mainnet
			baseUrl = 'https://etherscan.io'
			break
		case 11155111: // Sepolia
			baseUrl = 'https://sepolia.etherscan.io'
			break
		case 137: // Polygon
			baseUrl = 'https://polygonscan.com'
			break
		case 56: // BSC
			baseUrl = 'https://bscscan.com'
			break
		case 42161: // Arbitrum
			baseUrl = 'https://arbiscan.io'
			break
		case 10: // Optimism
			baseUrl = 'https://optimistic.etherscan.io'
			break
		case 8453: // Base
			baseUrl = 'https://basescan.org'
			break
		default:
			baseUrl = 'https://etherscan.io'
	}

	switch (type) {
		case 'tx':
			return `${baseUrl}/tx/${value}`
		case 'address':
			return `${baseUrl}/address/${value}`
		case 'block':
			return `${baseUrl}/block/${value}`
		default:
			return baseUrl
	}
}

// 格式化金额显示
function formatValue(value: string, decimals: number, symbol: string): string {
	try {
		// 将 wei 转换为正常单位
		const numValue = BigInt(value)
		const divisor = BigInt(10 ** decimals)
		const integerPart = numValue / divisor
		const remainder = numValue % divisor

		// 处理小数部分
		const decimalPart = remainder.toString().padStart(decimals, '0')
		const trimmedDecimal = decimalPart.replace(/0+$/, '') // 移除末尾的0

		if (trimmedDecimal === '') {
			return `${integerPart.toString()} ${symbol}`
		}

		// 只显示前6位小数
		const displayDecimal = trimmedDecimal.slice(0, 6)
		return `${integerPart.toString()}.${displayDecimal} ${symbol}`
	} catch (error) {
		console.error('Format value error:', error)
		return `${value} ${symbol}`
	}
}
// 交易哈希显示组件
function TxHashLink({ txHash, chainId, label }: { txHash: string; chainId?: string; label?: string }) {
	const displayHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`

	// 如果 chainId 不存在,只显示文本,不显示链接
	if (!chainId) {
		return (
			<span className="inline-flex items-center gap-1 text-gray-600 font-mono">
				{label || displayHash}
			</span>
		)
	}

	return (
		<a
			href={getExplorerUrl(chainId, 'tx', txHash)}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-mono"
		>
			{label || displayHash}
			<ExternalLink className="h-3 w-3" />
		</a>
	)
}

function getTransactionStatus(tx: TransactionCheckResponse | null): 'ready' | 'pending' | 'complete' | 'failed' | 'draft' {
	if (!tx) return 'draft'

	// 检查是否已执行
	if (tx.transaction.isExecuted) {
		// 根据执行结果判断成功或失败
		if (tx.transaction.isSuccessful) {
			return 'complete'
		} else {
			return 'failed'
		}
	}

	// 简化状态逻辑，基于 canExecute 判断
	if (tx.canExecute) return 'ready'

	return 'pending'
}

async function buildSafeTransaction(
	protocolKit: Safe,
	tx: TransactionCheckResponse
): Promise<SafeTransaction> {
	const metaTx: MetaTransactionData = {
		to: tx.transaction.to,
		value: tx.transaction.value,
		data: tx.transaction.data ?? '0x',
		operation: tx.transaction.operation
	}

	const safeTransaction = await protocolKit.createTransaction({
		transactions: [metaTx],
		options: {
			safeTxGas: tx.transaction.safeTxGas,
			baseGas: tx.transaction.baseGas,
			gasPrice: tx.transaction.gasPrice,
			gasToken: tx.transaction.gasToken,
			refundReceiver: tx.transaction.refundReceiver,
			nonce: Number(tx.transaction.nonce)
		}
	})

	// confirmations -> signatures Map
	const confirmations = tx.transaction.confirmations || []
	confirmations.forEach((confirmation) => {
		if (!confirmation.signature) return
		const signature: SafeSignature = {
			signer: confirmation.owner || tx.safe,
			data: confirmation.signature,
			isContractSignature: false,
			staticPart: function (_dynamicOffset?: string) {
				return this.data
			},
			dynamicPart: function () {
				return ''
			}
		}
		safeTransaction.addSignature(signature)
	})

	// 兼容旧版签名结构
	if (tx.transaction.signatures && typeof tx.transaction.signatures === 'object') {
		Object.entries(tx.transaction.signatures).forEach(([signer, sigData]) => {
			if (sigData && typeof sigData === 'object' && 'data' in sigData) {
				const signature: SafeSignature = {
					signer: (sigData as any).signer || signer,
					data: (sigData as any).data,
					isContractSignature: Boolean((sigData as any).isContractSignature),
					staticPart: function (_dynamicOffset?: string) {
						return this.data
					},
					dynamicPart: function () {
						return ''
					}
				}
				safeTransaction.addSignature(signature)
			}
		})
	}

	return safeTransaction
}

export default function TransactionDetail() {
	const { safeTxHash } = useParams<{ chainId: string; safeTxHash: string }>()
	const [tx, setTx] = useState<TransactionCheckResponse | null>(null)
	const [loading, setLoading] = useState<boolean>(false)
	const { toast } = useToast()
	const { walletProvider } = useAppKitProvider<Provider>("eip155")
	const { open } = useAppKit()
	const { isConnected, address } = useAppKitAccount()
	const [chainId, setChainId] = useState('')
	const [showRejectDialog, setShowRejectDialog] = useState(false)
	const [rejectReason, setRejectReason] = useState('')
	const [isConfirming, setIsConfirming] = useState(false)
	const [isExecuting, setIsExecuting] = useState(false)
	const [isRejecting, setIsRejecting] = useState(false)
	const [chainAssets, setChainAssets] = useState<ChainAsset[]>([])
	const [currentAsset, setCurrentAsset] = useState<ChainAsset | null>(null)

	// Refresh transaction details
	const refreshTx = useCallback(async () => {
		if (!safeTxHash) return
		const updated = await apis.transaction.checkTransaction(safeTxHash)
		setChainId(updated.chainId)
		setTx(updated)
		if (updated.canExecute) {
			// 通知服务器更新交易状态
			await apis.transaction.getSyncStatus(updated.safe)
		}
	}, [safeTxHash])

	// 加载链资产数据
	useEffect(() => {
		apis.chainAsset.getChainAssets().then((res) => {
			setChainAssets(res.data)
		})
	}, [])

	useEffect(() => {
		if (!safeTxHash) return
		setLoading(true)
		refreshTx()
			.finally(() => setLoading(false))
	}, [safeTxHash])

	// 根据 chainId 和 to 地址判断资产类型
	useEffect(() => {
		if (!tx || !chainId || chainAssets.length === 0) return

		// 查找匹配的链资产
		const asset = chainAssets.find((ca) => {
			// 匹配链ID
			const matchChain = Number(ca.chain.chainId) === Number(chainId)

			// 如果 to 地址是零地址或与 contractAddress 不匹配，则为本币
			const isNativeTx =
				tx.transaction.to === '0x0000000000000000000000000000000000000000' ||
				!tx.transaction.data ||
				tx.transaction.data === '0x'

			// 本币交易：匹配链且是本币
			if (isNativeTx) {
				return matchChain && ca.isNative
			}

			// 代币交易：匹配链且合约地址相同
			return matchChain && ca.contractAddress.toLowerCase() === tx.transaction.to.toLowerCase()
		})

		setCurrentAsset(asset || null)
	}, [tx, chainId, chainAssets])

	// Polling for transaction updates every second
	useEffect(() => {
		if (!safeTxHash) return

		// 如果交易已完成或失败，不再轮询
		const status = getTransactionStatus(tx)
		if (status === 'complete' || status === 'failed') {
			return
		}

		const interval = setInterval(() => {
			refreshTx()
		}, 2500)

		return () => clearInterval(interval)
	}, [safeTxHash, refreshTx, tx])

	if (loading) {
		return <div className="p-6">Loading...</div>
	}

	if (!tx) {
		return <div className="p-6">Transaction details not found</div>
	}

	const transactionStatus = getTransactionStatus(tx)
	const isFinalized = transactionStatus === 'complete' || transactionStatus === 'failed'
	const showExecute = tx.canExecute
	const showConfirm = !tx.canExecute

	const ConnectWallet = () => {
		open({ view: 'Connect', namespace: 'eip155' })
		return null
	}

	const handleConfirm = async () => {
		if (!tx) return
		if (!walletProvider) {
			toast({ description: 'Cannot find web3 provider', variant: 'destructive' })
			return
		}
		if (!address) {
			toast({ description: 'Cannot find account address', variant: 'destructive' })
			return
		}

		setIsConfirming(true)
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

			const signatureResp = await protocolKit.signHash(tx.transaction.safeTxHash)
			const signature = signatureResp.data

			const { success } = await apis.transaction.signTransaction({
				safeTxHash: tx.transaction.safeTxHash,
				signature: signature,
				signerAddress: address,
			})
			if (success) {
				toast({ description: 'Transaction confirmation sent', variant: 'default' })
			}
			await refreshTx()
		} catch (error: any) {
			console.error(error)
			toast({ description: `Error: ${error?.message || error}`, variant: 'destructive' })
		} finally {
			setIsConfirming(false)
		}
	}

	const handleExecute = async () => {
		if (!tx) return
		if (!walletProvider) {
			toast({ description: 'Cannot find web3 provider', variant: 'destructive' })
			return
		}

		setIsExecuting(true)
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

			const safeTransaction = await buildSafeTransaction(protocolKit, tx)

			await protocolKit.executeTransaction(safeTransaction)

			// 通知服务器更新交易状态
			await apis.transaction.getSyncStatus(tx.safe)


			toast({ description: 'Transaction execution sent', variant: 'default' })
			await refreshTx()
		} catch (error: any) {
			console.error(error)
			toast({ description: `Execution failed: ${error?.message || error}`, variant: 'destructive' })
		} finally {
			setIsExecuting(false)
		}
	}

	const handleRejectClick = () => {
		setShowRejectDialog(true)
	}

	const handleRejectConfirm = async () => {
		if (!tx) return
		if (!walletProvider) {
			toast({ description: 'Cannot find web3 provider', variant: 'destructive' })
			return
		}
		if (!address) {
			toast({ description: 'Cannot find account address', variant: 'destructive' })
			return
		}

		setIsRejecting(true)
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

			const signatureResp = await protocolKit.signHash(tx.transaction.safeTxHash)
			const signature = signatureResp.data

			const { success } = await apis.transaction.rejectTransaction({
				safeTxHash: tx.transaction.safeTxHash,
				signature: signature,
				ownerAddress: address,
				reason: rejectReason.trim() || undefined,
			})

			if (success) {
				toast({ description: 'Transaction rejected successfully', variant: 'default' })
				setShowRejectDialog(false)
				setRejectReason('')
			}
			await refreshTx()
		} catch (error: any) {
			console.error(error)
			toast({ description: `Reject failed: ${error?.message || error}`, variant: 'destructive' })
		} finally {
			setIsRejecting(false)
		}
	}

	return (
		<div className="p-6 flex justify-center">
			<div className="w-[960px]">
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
							<div className="font-medium font-mono">{tx.transaction.to}</div>
						</div>
						<div className="text-right">
							<div className="text-sm text-gray-500">Value</div>
							<div className="font-medium font-mono">
								{currentAsset
									? formatValue(tx.transaction.value, currentAsset.decimals, currentAsset.asset.symbol)
									: tx.transaction.value
								}
							</div>
						</div>
					</div>

					<table className="w-full table-fixed text-left">
						<tbody>
							{/* Safe 地址 */}
							<tr>
								<td className="w-40 py-2 text-gray-600">Safe Address</td>
								<td className="py-2">
									<div className="font-medium font-mono">{tx.safe}</div>
								</td>
							</tr>

							{/* To 地址 */}
							<tr>
								<td className="py-2 text-gray-600">To</td>
								<td className="py-2">
									<div className="font-medium font-mono">{tx.transaction.to}</div>
								</td>
							</tr>

							{/* 链上交易哈希 */}
							{tx.transaction.transactionHash && (
								<tr>
									<td className="py-2 text-gray-600">Transaction Hash</td>
									<td className="py-2">
										<TxHashLink txHash={tx.transaction.transactionHash} chainId={chainId} label={tx.transaction.transactionHash} />
									</td>
								</tr>
							)}

							{/* Gas 使用量 */}
							{tx.transaction.gasUsed && (
								<tr>
									<td className="py-2 text-gray-600">Gas Used</td>
									<td className="py-2 font-mono">{tx.transaction.gasUsed.toLocaleString()}</td>
								</tr>
							)}

							{/* 交易费用 */}
							{tx.transaction.fee && (
								<tr>
									<td className="py-2 text-gray-600">Transaction Fee</td>
									<td className="py-2 font-mono">{tx.transaction.fee}</td>
								</tr>
							)}

							{/* Data */}
							<tr>
								<td className="py-2 text-gray-600">Data</td>
								<td className="py-2 font-mono">
									<div className="max-w-xs truncate font-mono">
										{tx.transaction.data ?? '0x'}
									</div>
								</td>
							</tr>

							{/* Operation */}
							<tr>
								<td className="py-2 text-gray-600">Operation</td>
								<td className="py-2 font-mono">{tx.transaction.operation} (0 = call)</td>
							</tr>

							{/* Gas Token */}
							<tr>
								<td className="py-2 text-gray-600">Gas Token</td>
								<td className="py-2">
									<div className="font-medium font-mono">{tx.transaction.gasToken}</div>
								</td>
							</tr>

							{/* Refund Receiver */}
							{tx.transaction.refundReceiver && tx.transaction.refundReceiver !== '0x0000000000000000000000000000000000000000' && (
								<tr>
									<td className="py-2 text-gray-600">Refund Receiver</td>
									<td className="py-2">
										<div className="font-medium font-mono">{tx.transaction.refundReceiver}</div>
									</td>
								</tr>
							)}

							{/* Nonce */}
							<tr>
								<td className="py-2 text-gray-600">Nonce</td>
								<td className="py-2 font-mono">{tx.transaction.nonce}</td>
							</tr>

							{/* 执行时间 */}
							{tx.transaction.executionDate && (
								<tr>
									<td className="py-2 text-gray-600">Execution Date</td>
									<td className="py-2 font-mono">{new Date(tx.transaction.executionDate).toLocaleString()}</td>
								</tr>
							)}

							{/* Confirmations */}
							<tr>
								<td className="py-2 text-gray-600">Confirmations</td>
								<td className="py-2">
									<div className="font-mono">
										{tx.transaction.confirmations.length} / {tx.threshold}
									</div>
								</td>
							</tr>

							{/* Rejections */}
							<tr>
								<td className="py-2 text-gray-600">Rejections</td>
								<td className="py-2 font-mono">
									{tx.rejections?.length ?? 0}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* 右下角按钮：根据详情字段决定显示 Confirm / Execute / Reject */}
			{!isFinalized && (
				<div className="fixed right-6 bottom-6 flex gap-3">
					{!isConnected && <Button onClick={ConnectWallet}>Connect Wallet</Button>}
					{isConnected && <Button
						variant="destructive"
						onClick={handleRejectClick}
						disabled={isConfirming || isRejecting}
					>
						Reject
					</Button>}
					{isConnected && showConfirm && (
						<Button
							onClick={handleConfirm}
							disabled={isConfirming || isRejecting}
						>
							{isConfirming ? 'Confirming...' : 'Confirm'}
						</Button>
					)}
					{isConnected && showExecute && (
						<Button
							onClick={handleExecute}
							disabled={isExecuting}
						>
							{isExecuting ? 'Executing...' : 'Execute'}
						</Button>
					)}
				</div>
			)}

			{/* Reject Reason Dialog */}
			<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Transaction</DialogTitle>
						<DialogDescription>
							Please enter the reason for rejection (optional)
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Textarea
							placeholder="For example: insufficient budget, needs re-evaluation"
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							rows={4}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowRejectDialog(false)}
							disabled={isRejecting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleRejectConfirm}
							disabled={isRejecting}
						>
							{isRejecting ? 'Rejecting...' : 'Confirm Reject'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}


