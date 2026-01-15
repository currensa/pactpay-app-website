import { ChainAssetApi } from '@/apis/chain-asset.api'
import request from '@/apis/request'
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react'
import Safe, { PredictedSafeProps } from '@safe-global/protocol-kit'
import { useEffect, useMemo, useState } from 'react'
import { Address, createPublicClient, custom, formatEther, Chain as ViemChain } from 'viem'

// 选填：定义持久化状态的 Key
const PERSIST_KEY = 'pending_safe_deployment'

export default function CreateSafeWallet() {
  const { address, isConnected } = useAppKitAccount()
  const { chainId: currentWalletChainId } = useAppKitNetwork()
  const { walletProvider } = useAppKitProvider('eip155')
  const { open } = useAppKit()

  const chainAssetApi = useMemo(() => new ChainAssetApi(request), [])

  // 状态声明
  const [isLoading, setIsLoading] = useState(false)
  const [safeAddress, setSafeAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deploymentStatus, setDeploymentStatus] = useState<string>('')
  const [chains, setChains] = useState<any[]>([])
  const [selectedChainId, setSelectedChainId] = useState<number>(11155111) // 使用数字类型 ID
  const [isLoadingChains, setIsLoadingChains] = useState(true)
  const [owners, setOwners] = useState<string[]>([])
  const [threshold, setThreshold] = useState<number>(1)
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>('')

  // 1. 初始化加载
  useEffect(() => {
    const init = async () => {
      try {
        const chainData = await chainAssetApi.getChains()
        setChains(chainData)
        // 恢复之前未完成的部署状态 (可选优化)
        const saved = localStorage.getItem(PERSIST_KEY)
        if (saved) console.log('发现未完成的部署任务:', JSON.parse(saved))
      } catch (err) {
        setError('无法加载支持的网络列表')
      } finally {
        setIsLoadingChains(false)
      }
    }
    init()
  }, [chainAssetApi])

  // 2. 自动设置第一个 Owner
  useEffect(() => {
    if (address && owners.length === 0) {
      setOwners([address])
    }
  }, [address])

  const selectedChain = chains.find(c => Number(c.chainId) === selectedChainId)

  // 辅助方法：构建 Viem Chain 对象
  const getViemChain = (chainData: any): ViemChain => ({
    id: Number(chainData.chainId),
    name: chainData.name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [chainData.rpcUrls?.[0] || 'https://sepolia.drpc.org'] },
      public: { http: [chainData.rpcUrls?.[0] || 'https://sepolia.drpc.org'] },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: chainData.explorerUrls?.[0] || '' },
    },
  })

  // 3. 核心部署函数
  const handleCreateSafe = async () => {
    if (!isConnected || !walletProvider || !address) {
      open()
      return
    }

    // A. 网络校验与切换
    if (currentWalletChainId !== selectedChainId) {
      setDeploymentStatus('检测到网络不匹配，请在钱包中切换网络...')
      try {
        await (walletProvider as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
        })
      } catch (switchError) {
        setError('切换网络失败，请手动在钱包中切换。')
        return
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const viemChain = getViemChain(selectedChain)
      const publicClient = createPublicClient({ chain: viemChain, transport: custom(walletProvider as any) })

      // B. 校验与去重 Owners
      const uniqueOwners = Array.from(new Set(owners.filter(o => /^0x[a-fA-F0-9]{40}$/.test(o))))
      if (uniqueOwners.length < threshold) throw new Error('有效持有者数量少于签名阈值')

      const predictedSafe: PredictedSafeProps = {
        safeAccountConfig: { owners: uniqueOwners, threshold },
        safeDeploymentConfig: { safeVersion: '1.4.1' }
      }

      const protocolKit = await Safe.init({
        provider: walletProvider as any,
        signer: address,
        predictedSafe
      })

      const predAddr = await protocolKit.getAddress()
      setDeploymentStatus(`准备部署到地址: ${predAddr}`)

      // C. 检查 Safe 是否已部署
      const isDeployed = await protocolKit.isSafeDeployed()
      if (isDeployed) {
        setSafeAddress(predAddr)
        setDeploymentStatus('Safe 已在链上部署！')
        return
      }

      // D. Gas 检查
      const deployTx = await protocolKit.createSafeDeploymentTransaction()
      const userBalance = await publicClient.getBalance({ address: address as Address })
      
      // 预估部署费用 (这里简单估算，生产环境建议使用 estimateGas)
      const gasPrice = await publicClient.getGasPrice()
      const estimatedGasLimit = 500000n // 部署 Safe 大约消耗 30-50w gas
      const totalCost = gasPrice * estimatedGasLimit

      if (userBalance < totalCost) {
        throw new Error(`余额不足以支付 Gas。需要约 ${formatEther(totalCost)}，当前余额 ${formatEther(userBalance)}`)
      }

      // D. 发送交易与持久化
      setDeploymentStatus('正在请求钱包签名...')
      const client = await protocolKit.getSafeProvider().getExternalSigner()
      const txHash = await (client as any).sendTransaction({
        to: deployTx.to,
        value: BigInt(deployTx.value),
        data: deployTx.data,
        chain: viemChain
      })

      // 将 hash 存入本地，防止刷新页面丢失
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ txHash, predAddr, chainId: selectedChainId }))
      setDeploymentStatus(`交易已提交: ${txHash.slice(0, 10)}... 正在链上确认...`)

      // E. 等待确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2 })
      console.log('部署成功:', receipt)

      setSafeAddress(predAddr)
      setDeploymentStatus('Safe 部署成功！')
      localStorage.removeItem(PERSIST_KEY)

    } catch (err: any) {
      console.error(err)
      setError(err.message || '部署失败')
    } finally {
      setIsLoading(false)
    }
  }

  // --- UI 管理函数 ---
  const addOwner = () => {
    if (newOwnerAddress && /^0x[a-fA-F0-9]{40}$/.test(newOwnerAddress) && !owners.includes(newOwnerAddress)) {
      setOwners([...owners, newOwnerAddress]); setNewOwnerAddress('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white shadow-xl rounded-2xl border border-gray-100 my-10 font-sans">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">创建 Safe 智能钱包</h1>

      {/* 状态看板 */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-700 font-medium">钱包连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}</span>
          <span className="text-gray-500 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
      </div>

      {/* 网络选择 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">选择部署网络</label>
        {isLoadingChains ? (
          <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
        ) : (
          <select 
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={selectedChainId}
            onChange={(e) => setSelectedChainId(Number(e.target.value))}
          >
            {chains.map((c) => <option key={c.chainId} value={c.chainId}>{c.name} ({c.chainId})</option>)}
          </select>
        )}
      </div>

      {/* 持有者管理 */}
      <div className="space-y-4 mb-6">
        <label className="block text-sm font-semibold text-gray-700">多签持有者 (Owners)</label>
        {owners.map((owner, idx) => (
          <div key={idx} className="flex gap-2">
            <input 
              disabled={idx === 0}
              className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm"
              value={owner}
              onChange={(e) => {
                const newOwners = [...owners]; newOwners[idx] = e.target.value; setOwners(newOwners);
              }}
            />
            {owners.length > 1 && (
              <button onClick={() => setOwners(owners.filter((_, i) => i !== idx))} className="px-3 py-1 text-red-500 hover:bg-red-50 rounded">删除</button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <input 
            className="flex-1 p-2 border border-dashed border-gray-300 rounded-md text-sm"
            placeholder="添加新持有者地址 0x..."
            value={newOwnerAddress}
            onChange={(e) => setNewOwnerAddress(e.target.value)}
          />
          <button onClick={addOwner} className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700">添加</button>
        </div>
      </div>

      {/* 阈值调节 */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          签名阈值: <span className="text-blue-600">{threshold}</span> / {owners.length}
        </label>
        <input 
          type="range" min="1" max={owners.length || 1} value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* 操作按钮 */}
      <button
        disabled={isLoading || !isConnected}
        onClick={handleCreateSafe}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
          isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
        }`}
      >
        {isLoading ? '正在处理中...' : '立即部署 Safe 钱包'}
      </button>

      {/* 提示信息 */}
      {deploymentStatus && <p className="mt-4 text-sm text-center text-blue-600 animate-pulse">{deploymentStatus}</p>}
      {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">⚠️ {error}</div>}

      {/* 成功展示 */}
      {safeAddress && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl">
          <h3 className="text-green-800 font-bold mb-2">🎉 部署成功!</h3>
          <p className="text-sm text-green-700 break-all font-mono mb-2">{safeAddress}</p>
          <a 
            href={`${selectedChain?.explorerUrls?.[0]}/address/${safeAddress}`}
            target="_blank" rel="noreferrer"
            className="text-xs text-green-600 underline hover:text-green-800"
          >
            在区块浏览器中查看
          </a>
        </div>
      )}
    </div>
  )
}