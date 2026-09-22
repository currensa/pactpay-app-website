import type { Provider } from '@reown/appkit/react'
import { AbiCoder, keccak256, toUtf8Bytes } from 'ethers'

export const EMPTY_PAYLOAD_HASH = `0x${'00'.repeat(32)}`

export interface WalletChallenge {
  nonce: string
  expiresAt: number
  action: 'login' | 'privacy-profile-register'
  payloadHash: string
  family: 'evm'
  domain: { name: string; version: string }
}

export function privacyProfilePayloadHash(encryptedSecret: string, secretHash: string, encPubkey: string): string {
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'bytes32'],
      [keccak256(toUtf8Bytes(encryptedSecret)), secretHash, keccak256(toUtf8Bytes(encPubkey))]
    )
  )
}

export async function signWalletChallenge(provider: Provider, address: string, challenge: WalletChallenge) {
  return provider.request<string>({
    method: 'eth_signTypedData_v4',
    params: [
      address,
      JSON.stringify({
        domain: challenge.domain,
        primaryType: 'WalletAuthorization',
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' }
          ],
          WalletAuthorization: [
            { name: 'action', type: 'string' },
            { name: 'family', type: 'string' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'expiresAt', type: 'uint256' },
            { name: 'payloadHash', type: 'bytes32' }
          ]
        },
        message: {
          action: challenge.action,
          family: challenge.family,
          nonce: challenge.nonce,
          expiresAt: String(challenge.expiresAt),
          payloadHash: challenge.payloadHash
        }
      })
    ]
  })
}
