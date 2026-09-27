import type { BoxKeyPair } from 'tweetnacl'

type CacheEntry = { identity: string; keyPair: BoxKeyPair }

/** Tab-memory only; callers must pass the current authenticated wallet identity. */
export class PrivacyUnlockCache {
  private entry: CacheEntry | null = null
  private remembered = false

  get rememberKey() { return this.remembered }
  get(identity: string | null): BoxKeyPair | null {
    return identity && this.entry?.identity === identity && this.remembered ? this.entry.keyPair : null
  }
  setRememberKey(value: boolean) {
    this.remembered = value
    if (!value) this.entry = null
  }
  cache(identity: string | null, keyPair: BoxKeyPair) {
    if (identity && this.remembered) this.entry = { identity, keyPair }
  }
  forgetKeyPair() { this.entry = null }
  clear() {
    this.entry = null
    this.remembered = false
  }
}
