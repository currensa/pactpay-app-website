const BASE = '/api/circuit'
const DB_NAME = 'pactpay-org-circuit-cache'
const STORE_NAME = 'artifacts'
const TIERS = [8, 16, 32, 64, 128] as const
const CIRCUITS = ['deposit', 'withdraw', 'refund'] as const
type Circuit = typeof CIRCUITS[number]

type Artifact = { path: string; size: number; sha256: string }
type Manifest = { schemaVersion: number; bundleVersion: string; artifacts: Record<string, Artifact> }
type Stored = Artifact & { key: string; bytes: ArrayBuffer }

const memory = new Map<string, ArrayBuffer>()
const inFlight = new Map<string, Promise<ArrayBuffer>>()
let databasePromise: Promise<IDBDatabase | null> | undefined

function validateManifest(value: unknown): Manifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid circuit manifest')
  const manifest = value as Partial<Manifest>
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{64}$/i.test(manifest.bundleVersion ?? '')) {
    throw new Error('Unsupported circuit manifest')
  }
  const entries = Object.entries(manifest.artifacts ?? {})
  if (entries.length !== CIRCUITS.length * TIERS.length * 2) throw new Error('Circuit manifest is incomplete')
  for (const circuit of CIRCUITS) for (const tier of TIERS) for (const extension of ['wasm', 'zkey']) {
    const key = `${circuit}_${tier}.${extension}`
    const entry = manifest.artifacts?.[key]
    const path = extension === 'wasm'
      ? `${circuit}_${tier}_js/${circuit}_${tier}.wasm`
      : `${circuit}_${tier}_final.zkey`
    if (!entry || entry.path !== path || !Number.isSafeInteger(entry.size) || entry.size <= 0 ||
      !/^[a-f0-9]{64}$/i.test(entry.sha256)) throw new Error(`Invalid circuit artifact: ${key}`)
  }
  return manifest as Manifest
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return null
  if (!databasePromise) databasePromise = new Promise(resolve => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        try {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
        } catch { resolve(null) }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch { resolve(null) }
  })
  return databasePromise
}

async function readStored(key: string): Promise<Stored | null> {
  const database = await openDatabase()
  if (!database) return null
  return new Promise(resolve => {
    try {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function writeStored(record: Stored): Promise<void> {
  const database = await openDatabase()
  if (!database) return
  await new Promise<void>(resolve => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(record)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
      transaction.onabort = () => resolve()
    } catch { resolve() }
  })
}

async function verified(bytes: ArrayBuffer, artifact: Artifact): Promise<boolean> {
  if (bytes.byteLength !== artifact.size) return false
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return hash === artifact.sha256.toLowerCase()
}

async function download(artifact: Artifact, version: string, onStatus?: (message: string) => void): Promise<ArrayBuffer> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 180_000)
    try {
      const response = await fetch(`${BASE}/${artifact.path}?v=${version}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      let bytes: ArrayBuffer
      if (response.body) {
        const output = new Uint8Array(artifact.size)
        const reader = response.body.getReader()
        let offset = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (offset + value.byteLength > output.length) {
            await reader.cancel()
            throw new Error('Download exceeded manifest size')
          }
          output.set(value, offset)
          offset += value.byteLength
        }
        if (offset !== output.length) throw new Error('Download was shorter than manifest size')
        bytes = output.buffer
      } else {
        bytes = await response.arrayBuffer()
      }
      if (!await verified(bytes, artifact)) throw new Error(`Circuit integrity check failed: ${artifact.path}`)
      onStatus?.('Circuit files verified')
      return bytes
    } catch (error) {
      lastError = error
      onStatus?.('Retrying circuit download…')
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError
}

async function load(artifact: Artifact, version: string, onStatus?: (message: string) => void): Promise<ArrayBuffer> {
  const key = `${version}:${artifact.path}:${artifact.sha256}`
  const cached = memory.get(key)
  if (cached) return cached
  const pending = inFlight.get(key)
  if (pending) return pending
  const promise = (async () => {
    const stored = await readStored(key)
    if (stored && await verified(stored.bytes, artifact)) {
      memory.set(key, stored.bytes)
      return stored.bytes
    }
    const bytes = await download(artifact, version, onStatus)
    memory.set(key, bytes)
    await writeStored({ ...artifact, key, bytes })
    return bytes
  })().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

export async function fetchCircuitBundle(circuit: Circuit, tier: number, onStatus?: (message: string) => void) {
  if (!TIERS.some(value => value === tier)) throw new Error(`Unsupported circuit tier: ${tier}`)
  const response = await fetch(`${BASE}/manifest.json`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Circuit manifest unavailable (${response.status})`)
  const manifest = validateManifest(await response.json())
  onStatus?.('Loading verified circuit files…')
  const [wasm, zkey] = await Promise.all([
    load(manifest.artifacts[`${circuit}_${tier}.wasm`], manifest.bundleVersion, onStatus),
    load(manifest.artifacts[`${circuit}_${tier}.zkey`], manifest.bundleVersion, onStatus),
  ])
  return { wasm, zkey, bundleVersion: manifest.bundleVersion }
}
