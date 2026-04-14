import api from '@/apis'
import { getMetaPublicKey } from '@/lib/stealth-key'
import type { Provider } from '@reown/appkit/react'
import { ethers } from 'ethers'

/**
 * Step 2 only: sign `metaPub + signMessage` to produce metaPubSignature.
 * Used by both the full submission flow and the dashboard verify flow.
 */
export async function signMetaPubChallenge(
  walletProvider: Provider,
  address: string,
  metaPub: string,
  signMessage: string,
): Promise<string> {
  return walletProvider.request<string>({
    method: 'personal_sign',
    params: [metaPub + signMessage, address],
  })
}

/**
 * Full steps 1+2: fetch nonce, derive metaPub from wallet signature, then produce metaPubSignature.
 * Used in bind-wallet and settings to register / refresh the privacy identity.
 *
 * @param onStep optional callback to surface progress messages to the UI
 * @returns { metaPub, signMessage, metaPubSignature } ready for submitMetaPub
 */
export async function prepareMetaPubSubmission(
  walletProvider: Provider,
  address: string,
  onStep?: (msg: string) => void,
): Promise<{ metaPub: string; signMessage: string; metaPubSignature: string }> {
  // Step 1: fetch server-issued nonce
  const { signMessage } = await api.auth.getmetaPubSignaturenMessage()

  // Step 1 wallet sign: derive metaPriv → metaPub (never leaves the client)
  onStep?.('Step 1/2 — Please sign in your wallet to generate your privacy key.')
  const signature = await walletProvider.request<string>({
    method: 'personal_sign',
    params: [signMessage, address],
  })
  const metaPriv = ethers.keccak256(ethers.getBytes(signature))
  const metaPub = getMetaPublicKey(metaPriv)

  // Step 2 wallet sign: prove this address authorises the above metaPub
  onStep?.('Step 2/2 — Please sign again to bind your privacy key to your wallet address.')
  const metaPubSignature = await signMetaPubChallenge(walletProvider, address, metaPub, signMessage)

  return { metaPub, signMessage, metaPubSignature }
}
