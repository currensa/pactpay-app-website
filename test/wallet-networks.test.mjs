import assert from 'node:assert/strict'
import { buildWalletNetworks } from '../src/providers/wallet-networks.ts'

const sepolia = {
  chainId: 11155111,
  chainName: 'Ethereum Sepolia',
  family: 'evm',
  isTestnet: true,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.example/rpc'],
  blockExplorerUrls: ['https://sepolia.example/explorer'],
}
const monad = {
  ...sepolia,
  chainId: 10143,
  chainName: 'Monad Testnet',
  rpcUrls: ['https://monad.example/rpc'],
}

const networks = buildWalletNetworks([sepolia, monad])
assert.deepEqual(networks.map(network => network.id), [11155111, 10143])
assert.deepEqual(networks.map(network => network.rpcUrls.default.http[0]), [
  'https://sepolia.example/rpc',
  'https://monad.example/rpc',
])
assert.equal(networks[0].blockExplorers.default.url, sepolia.blockExplorerUrls[0])
assert.throws(() => buildWalletNetworks([]), /No wallet networks/)
assert.throws(() => buildWalletNetworks([sepolia, sepolia]), /Invalid wallet network/)
assert.throws(() => buildWalletNetworks([{ ...sepolia, rpcUrls: [] }]), /Invalid wallet network/)
console.log('Wallet network tests passed')
