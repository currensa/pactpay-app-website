import { useToast } from '@/components/ui/use-toast'
import { useState } from 'react'

export interface WalletUpdateState {
  newWalletAddress: string
  confirmWalletAddress: string
  selectedNetwork: string
  addressError: string
  isUpdating: boolean
}

export interface WalletUpdateActions {
  setNewWalletAddress: (value: string) => void
  setConfirmWalletAddress: (value: string) => void
  setSelectedNetwork: (value: string) => void
  handleUpdateWallet: (onSuccess?: () => void) => Promise<void>
  resetForm: () => void
}

export function useWalletUpdate() {
  const { toast } = useToast()
  const [newWalletAddress, setNewWalletAddress] = useState('')
  const [confirmWalletAddress, setConfirmWalletAddress] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('Ethereum Mainnet')
  const [addressError, setAddressError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const validateAddressFormat = (address: string): boolean => {
    // 以太坊地址格式：0x 开头，后面跟 40 个十六进制字符（不区分大小写）
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/
    return ethereumAddressRegex.test(address)
  }

  const validateAddresses = () => {
    if (!newWalletAddress || !confirmWalletAddress) {
      return false
    }
    if (newWalletAddress !== confirmWalletAddress) {
      setAddressError('Wallet addresses do not match')
      return false
    }
    setAddressError('')
    return true
  }

  const handleConfirmAddressChange = (value: string) => {
    setConfirmWalletAddress(value)
    if (value && newWalletAddress && value !== newWalletAddress) {
      setAddressError('Wallet addresses do not match')
    } else {
      setAddressError('')
    }
  }

  const handleNewAddressChange = (value: string) => {
    setNewWalletAddress(value)
    if (value && confirmWalletAddress && value !== confirmWalletAddress) {
      setAddressError('Wallet addresses do not match')
    } else {
      setAddressError('')
    }
  }

  const handleUpdateWallet = async (onSuccess?: () => void) => {
    if (!validateAddresses()) {
      return
    }

    // 校验地址格式
    if (!validateAddressFormat(newWalletAddress)) {
      toast({
        title: 'Error',
        description: `Invalid address format for ${selectedNetwork}`,
        variant: 'destructive'
      })
      return
    }

    setIsUpdating(true)

    try {
      // 模拟 API 调用（实际使用时替换为真实 API）
      await new Promise(resolve => setTimeout(resolve, 1500))

      toast({
        title: 'Success',
        description: 'Wallet address updated successfully'
      })
      
      resetForm()
      onSuccess?.()
    } catch (error) {
      // API 调用失败时显示错误提示
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Error',
        description: errorMessage.includes('Invalid address format')
          ? `Invalid address format for ${selectedNetwork}`
          : errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const resetForm = () => {
    setNewWalletAddress('')
    setConfirmWalletAddress('')
    setAddressError('')
  }

  return {
    state: {
      newWalletAddress,
      confirmWalletAddress,
      selectedNetwork,
      addressError,
      isUpdating
    },
    actions: {
      setNewWalletAddress: handleNewAddressChange,
      setConfirmWalletAddress: handleConfirmAddressChange,
      setSelectedNetwork,
      handleUpdateWallet,
      resetForm
    }
  }
}

