'use client'
import nacl from 'tweetnacl'

type TypedDataParam = { name: string; type: string }
export type WalletClient = {
  signTypedData(args: {
    domain: { name: string; version: string }
    types: Record<string, TypedDataParam[]>
    primaryType: string
    message: Record<string, string>
  }): Promise<`0x${string}`>
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  return out
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map(v => v.toString(16).padStart(2, '0')).join('')
}

async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
}

// Derives a NaCl box key pair from a wallet EIP-712 signature over `password`.
// The private key is never stored — caller must re-derive when needed.
export async function deriveNaclKeyPair(
  password: string,
  walletClient: WalletClient,
): Promise<nacl.BoxKeyPair> {
  const sig = await walletClient.signTypedData({
    domain: { name: 'GravArc', version: '1' },
    types: {
      EncryptionKey: [{ name: 'password', type: 'string' }],
    },
    primaryType: 'EncryptionKey',
    message: { password },
  })
  const seed = await sha256Bytes(hexToBytes(sig))
  return nacl.box.keyPair.fromSecretKey(seed)
}

// Symmetric encryption of the user's own secret.
// key = keyPair.secretKey (32-byte seed — same as nacl.secretbox key length).
// Returns "<nonce>:<ciphertext>" — all hex-encoded.
export function secretboxEncryptWithKey(plaintext: string, key: Uint8Array): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const ct = nacl.secretbox(new TextEncoder().encode(plaintext), nonce, key)
  return bytesToHex(nonce) + ':' + bytesToHex(ct)
}

export function secretboxDecryptWithKey(encrypted: string, key: Uint8Array): string {
  const [nonceHex, ctHex] = encrypted.split(':')
  const plain = nacl.secretbox.open(hexToBytes(ctHex), hexToBytes(nonceHex), key)
  if (!plain) throw new Error('Decryption failed — wrong password or corrupted data')
  return new TextDecoder().decode(plain)
}

// Encrypts `message` for a recipient identified by their public key hex.
// Returns "<ephemeralPubKey>:<nonce>:<ciphertext>" — all hex-encoded.
export function naclEncrypt(message: string, recipientPubKeyHex: string): string {
  const ephemeral = nacl.box.keyPair()
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const ciphertext = nacl.box(
    new TextEncoder().encode(message),
    nonce,
    hexToBytes(recipientPubKeyHex),
    ephemeral.secretKey,
  )
  return bytesToHex(ephemeral.publicKey) + ':' + bytesToHex(nonce) + ':' + bytesToHex(ciphertext)
}

// Decrypts a message encrypted with `naclEncrypt` using an already-derived key pair.
// Use this when the key pair is cached in memory to avoid re-triggering MetaMask.
export function naclDecryptWithKeyPair(
  encrypted: string,
  keyPair: { secretKey: Uint8Array },
): string {
  const [ephemeralPubKeyHex, nonceHex, ciphertextHex] = encrypted.split(':')
  const plain = nacl.box.open(
    hexToBytes(ciphertextHex),
    hexToBytes(nonceHex),
    hexToBytes(ephemeralPubKeyHex),
    keyPair.secretKey,
  )
  if (!plain) throw new Error('Decryption failed — wrong password or corrupted message')
  return new TextDecoder().decode(plain)
}

// Decrypts a message encrypted with `naclEncrypt` by re-deriving the key pair from password.
export async function naclDecrypt(
  encrypted: string,
  password: string,
  walletClient: WalletClient,
): Promise<string> {
  const [ephemeralPubKeyHex, nonceHex, ciphertextHex] = encrypted.split(':')
  const keyPair = await deriveNaclKeyPair(password, walletClient)
  const plain = nacl.box.open(
    hexToBytes(ciphertextHex),
    hexToBytes(nonceHex),
    hexToBytes(ephemeralPubKeyHex),
    keyPair.secretKey,
  )
  if (!plain) throw new Error('Decryption failed — wrong password or corrupted message')
  return new TextDecoder().decode(plain)
}
