/**
 * StealthKey SDK (copied from sdk/src/StealthKey.ts)
 *
 * ECDH 隐身地址推导，实现 EIP-5564 精神的链下密钥协议。
 *
 * 流程：
 *   员工：metaPrivKey → metaPubKey (公开给 HR)
 *   HR  ：ephemeralPrivKey + metaPubKey → stealthAddress / stealthPubKey
 *   员工：metaPrivKey + ephemeralPubKey → stealthPrivKey (可签名提款)
 */

import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

const CURVE_ORDER: bigint = secp256k1.CURVE.n

function strip0x(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex
}

function to32Bytes(hex: string): Uint8Array {
  return hexToBytes(strip0x(hex).padStart(64, '0'))
}

function sharedSecret(scalarHex: string, pubHex: string): Uint8Array {
  const point = secp256k1.ProjectivePoint.fromHex(strip0x(pubHex))
  const scalar = BigInt('0x' + strip0x(scalarHex).padStart(64, '0'))
  return point.multiply(scalar).toRawBytes(false) // uncompressed 65 B，与后端 getSharedSecret(..., false) 保持一致
}

function sharedSecretToScalar(secret: Uint8Array): bigint {
  return BigInt('0x' + bytesToHex(keccak_256(secret))) % CURVE_ORDER
}

function pubBytesToAddress(uncompressed: Uint8Array): string {
  const hash = keccak_256(uncompressed.slice(1))
  return '0x' + bytesToHex(hash).slice(24)
}

export function getMetaPublicKey(metaPrivateKey: string): string {
  const privBytes = to32Bytes(metaPrivateKey)
  const pubBytes = secp256k1.getPublicKey(privBytes, false)
  return '0x' + bytesToHex(pubBytes)
}

export function computeStealthAddress(
  metaPublicKey: string,
  ephemeralPrivateKey: string,
): { stealthAddress: string; stealthPublicKey: string } {
  const secret = sharedSecret(ephemeralPrivateKey, metaPublicKey)
  const h = sharedSecretToScalar(secret)
  const metaPoint = secp256k1.ProjectivePoint.fromHex(strip0x(metaPublicKey))
  const stealthPoint = metaPoint.add(secp256k1.ProjectivePoint.BASE.multiply(h))
  const stealthPub = stealthPoint.toRawBytes(false)
  return {
    stealthPublicKey: '0x' + bytesToHex(stealthPub),
    stealthAddress: pubBytesToAddress(stealthPub),
  }
}

export function recoverStealthPrivateKey(
  metaPrivateKey: string,
  ephemeralPublicKey: string,
): string {
  const secret = sharedSecret(metaPrivateKey, ephemeralPublicKey)
  const h = sharedSecretToScalar(secret)
  const metaPrivBigInt = BigInt('0x' + strip0x(metaPrivateKey).padStart(64, '0'))
  const stealthPrivBigInt = (metaPrivBigInt + h) % CURVE_ORDER
  return '0x' + stealthPrivBigInt.toString(16).padStart(64, '0')
}
