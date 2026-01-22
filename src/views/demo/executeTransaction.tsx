import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import { ethers } from 'ethers';
import { useMemo, useState } from 'react';
import { LocalSafeManager } from "./utils/LocalSafeManager";

export default function ExecuteTransaction() {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const { open } = useAppKit()

  const manager = useMemo(() => new LocalSafeManager(), [])

  // 状态管理
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  // 表单数据
  const [safeAddress, setSafeAddress] = useState<string>('')
  const [toAddress, setToAddress] = useState<string>('')
  const [amount, setAmount] = useState<string>('0.001')
  const [txHash, setTxHash] = useState<string>('')
  const [executionResult, setExecutionResult] = useState<any>(null)

  // 创建交易数据
  const txData: SafeTransactionDataPartial = useMemo(() => ({
    to: toAddress || '0x0000000000000000000000000000000000000000',
    value: ethers.parseEther(amount || '0').toString(),
    data: "0x",
    operation: 0
  }), [toAddress, amount])


  // 第一步：签名交易
  const handleSignTransaction = async () => {
    if (!isConnected || !walletProvider || !address) {
      open()
      return
    }

    if (!safeAddress || !toAddress) {
      setError('请填写 Safe 地址和接收地址')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const hash = await manager.signAndStore(walletProvider, address, safeAddress, txData)
      setTxHash(hash)
      setStatus(`交易已签名，Hash: ${hash.slice(0, 10)}... 请让其他持有者签名`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || '签名失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 第二步：执行交易
  const handleExecuteTransaction = async () => {
    if (!isConnected || !walletProvider || !address) {
      open()
      return
    }

    if (!safeAddress || !txHash) {
      setError('请先签名交易并获取交易 Hash')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setStatus('正在执行交易...')
      const result = await manager.executeFromStorage(walletProvider, address, safeAddress, txHash)
      setExecutionResult(result)
      setStatus(`交易执行成功！Hash: ${result.hash}`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || '执行失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white shadow-xl rounded-2xl border border-gray-100 my-10 font-sans">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">执行 Safe 多签交易</h1>

      {/* 连接状态 */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-700 font-medium">
            钱包连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}
          </span>
          <span className="text-gray-500 font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        {!isConnected && (
          <div className="mt-3">
            <button
              onClick={() => open()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              连接钱包
            </button>
          </div>
        )}
      </div>

      {/* Safe 地址输入 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Safe 合约地址
        </label>
        <input
          type="text"
          className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="0x..."
          value={safeAddress}
          onChange={(e) => setSafeAddress(e.target.value)}
        />
      </div>

      {/* 交易参数 */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            接收地址
          </label>
          <input
            type="text"
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0x..."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            转账金额 (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {txHash && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              交易 Hash
            </label>
            <input
              type="text"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
              value={txHash}
              readOnly
            />
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3 mb-6">
        <button
          disabled={isLoading || !isConnected}
          onClick={handleSignTransaction}
          className={`w-full py-3 rounded-lg font-medium text-white shadow-lg transition-all ${
            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          {isLoading ? '处理中...' : '1. 签名交易'}
        </button>

        <button
          disabled={isLoading || !isConnected || !txHash}
          onClick={handleExecuteTransaction}
          className={`w-full py-3 rounded-lg font-medium text-white shadow-lg transition-all ${
            isLoading || !txHash ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'
          }`}
        >
          {isLoading ? '处理中...' : '2. 执行交易'}
        </button>
      </div>

      {/* 状态提示 */}
      {status && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100">
          {status}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          ⚠️ {error}
        </div>
      )}

      {/* 执行结果 */}
      {executionResult && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-green-800 font-bold mb-2">🎉 执行成功!</h3>
          <div className="text-sm space-y-1">
            <p><strong>交易 Hash:</strong> <span className="font-mono">{executionResult.hash}</span></p>
            {executionResult.transactionResponse && (
              <p><strong>区块号:</strong> {executionResult.transactionResponse.blockNumber}</p>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <h4 className="font-semibold mb-2">使用流程：</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>第一个持有者连接钱包并签名交易</li>
          <li>其他持有者依次签名（交易 Hash 会自动保存）</li>
          <li>当签名数量达到阈值时，任意持有者可以执行交易</li>
        </ol>
      </div>
    </div>
  )
}