import { safeStorage } from 'electron'
import {
  randomBytes,
  pbkdf2Sync,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv
} from 'crypto'

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  salt: {
    length: 32
  },
  hash: {
    iterations: 350_000,
    keyLength: 64,
    digest: 'sha512'
  },
  encryption: {
    keyLength: 32,
    ivLength: 16,
    authTagLength: 16,
    iterations: 50_000,
    algorithm: 'aes-256-gcm'
  },
  rateLimit: {
    maxAttempts: 5,
    baseLockoutMs: 5 * 60 * 1000,
    attemptResetMs: 15 * 60 * 1000,
    maxLockoutMultiplier: 12
  }
} as const

// =============================================================================
// Types
// =============================================================================

interface LockoutState {
  count: number
  lastAttempt: number
  lockedUntil: number | null
  lockoutCount: number
}

interface PinData {
  hash: string
  salt: string
  encryptionSalt?: string
  lockout?: LockoutState
}

interface LockoutStatus {
  locked: boolean
  lockoutSeconds?: number
  remainingAttempts: number
}

interface VerifyPinResult {
  success: boolean
  locked: boolean
  remainingAttempts: number
  lockoutSeconds?: number
  updatedEncryptedData?: string
}

type PinOperationResult<T> = { ok: true; value: T } | { ok: false; error: string }

// =============================================================================
// Lockout Manager
// =============================================================================

class LockoutManager {
  #state: LockoutState

  constructor(initial?: LockoutState) {
    this.#state = initial ?? this.#createDefaultState()
  }

  #createDefaultState(): LockoutState {
    return { count: 0, lastAttempt: 0, lockedUntil: null, lockoutCount: 0 }
  }

  #calculateLockoutDuration(): number {
    const multiplier = Math.min(
      this.#state.lockoutCount + 1,
      CONFIG.rateLimit.maxLockoutMultiplier
    )
    return CONFIG.rateLimit.baseLockoutMs * multiplier
  }

  loadFromPinData(lockout: LockoutState | undefined): void {
    if (!lockout || !this.#isValidLockoutState(lockout)) {
      this.#state = this.#createDefaultState()
      return
    }

    const now = Date.now()

    if (lockout.lockedUntil && now >= lockout.lockedUntil) {
      this.#state = {
        count: 0,
        lastAttempt: 0,
        lockedUntil: null,
        lockoutCount: lockout.lockoutCount
      }
    } else if (lockout.lastAttempt && now - lockout.lastAttempt > CONFIG.rateLimit.attemptResetMs) {
      this.#state = this.#createDefaultState()
    } else {
      this.#state = { ...lockout }
    }
  }

  #isValidLockoutState(lockout: unknown): lockout is LockoutState {
    if (typeof lockout !== 'object' || lockout === null) return false
    const l = lockout as Record<string, unknown>
    return (
      typeof l.count === 'number' &&
      typeof l.lastAttempt === 'number' &&
      typeof l.lockoutCount === 'number'
    )
  }

  checkAndUpdateExpiry(now: number = Date.now()): void {
    if (this.#state.lockedUntil && now >= this.#state.lockedUntil) {
      this.#state.lockedUntil = null
      this.#state.count = 0
    }

    if (
      this.#state.lastAttempt &&
      now - this.#state.lastAttempt > CONFIG.rateLimit.attemptResetMs
    ) {
      this.#state = this.#createDefaultState()
    }
  }

  isLocked(now: number = Date.now()): { locked: true; seconds: number } | { locked: false } {
    if (this.#state.lockedUntil && now < this.#state.lockedUntil) {
      return {
        locked: true,
        seconds: Math.ceil((this.#state.lockedUntil - now) / 1000)
      }
    }
    return { locked: false }
  }

  recordFailure(now: number = Date.now()): {
    locked: boolean
    remainingAttempts: number
    lockoutSeconds?: number
  } {
    this.#state.count++
    this.#state.lastAttempt = now

    const remainingAttempts = CONFIG.rateLimit.maxAttempts - this.#state.count

    if (this.#state.count >= CONFIG.rateLimit.maxAttempts) {
      this.#state.lockoutCount = Math.min(
        this.#state.lockoutCount + 1,
        CONFIG.rateLimit.maxLockoutMultiplier
      )
      const lockoutDuration = this.#calculateLockoutDuration()
      this.#state.lockedUntil = now + lockoutDuration

      return {
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(lockoutDuration / 1000)
      }
    }

    return { locked: false, remainingAttempts }
  }

  recordSuccess(): void {
    this.#state = this.#createDefaultState()
  }

  applyMaxLockout(now: number = Date.now()): number {
    const lockoutDuration = CONFIG.rateLimit.baseLockoutMs * CONFIG.rateLimit.maxLockoutMultiplier
    this.#state = {
      count: CONFIG.rateLimit.maxAttempts,
      lastAttempt: now,
      lockedUntil: now + lockoutDuration,
      lockoutCount: CONFIG.rateLimit.maxLockoutMultiplier
    }
    return Math.ceil(lockoutDuration / 1000)
  }

  reset(): void {
    this.#state = this.#createDefaultState()
  }

  getStatus(): LockoutStatus {
    const lockCheck = this.isLocked()
    if (lockCheck.locked) {
      return { locked: true, lockoutSeconds: lockCheck.seconds, remainingAttempts: 0 }
    }
    return {
      locked: false,
      remainingAttempts: CONFIG.rateLimit.maxAttempts - this.#state.count
    }
  }

  serialize(): LockoutState {
    return { ...this.#state }
  }
}

// =============================================================================
// Pin Service
// =============================================================================

class PinService {
  #isPinVerified: boolean = false
  #derivedEncryptionKey: Buffer | null = null
  #lockoutManager: LockoutManager

  constructor() {
    this.#lockoutManager = new LockoutManager()
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  public initialize(): void {
    this.#isPinVerified = false
    this.#clearDerivedKey()
    this.#lockoutManager.reset()
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  #validatePinFormat(pin: string): boolean {
    return typeof pin === 'string' && /^\d{6}$/.test(pin)
  }

  #isValidPinData(data: unknown): data is PinData {
    if (typeof data !== 'object' || data === null) return false
    const d = data as Record<string, unknown>
    return (
      typeof d.hash === 'string' &&
      typeof d.salt === 'string' &&
      d.hash.length > 0 &&
      d.salt.length > 0
    )
  }

  #decryptPinData(encryptedData: string): PinOperationResult<PinData> {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return { ok: false, error: 'Invalid encrypted data' }
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: 'SafeStorage not available' }
    }

    try {
      const encryptedBuffer = Buffer.from(encryptedData, 'base64')
      const decryptedJson = safeStorage.decryptString(encryptedBuffer)
      const pinData: unknown = JSON.parse(decryptedJson)

      if (!this.#isValidPinData(pinData)) {
        return { ok: false, error: 'Invalid PIN data structure' }
      }

      return { ok: true, value: pinData }
    } catch {
      return { ok: false, error: 'Failed to decrypt PIN data' }
    }
  }

  #encryptPinData(pinData: PinData): PinOperationResult<string> {
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: 'SafeStorage not available' }
    }

    try {
      const jsonData = JSON.stringify(pinData)
      const encrypted = safeStorage.encryptString(jsonData)
      return { ok: true, value: encrypted.toString('base64') }
    } catch {
      return { ok: false, error: 'Failed to encrypt PIN data' }
    }
  }

  #hashPin(pin: string, salt: Buffer): Buffer {
    return pbkdf2Sync(
      pin,
      salt,
      CONFIG.hash.iterations,
      CONFIG.hash.keyLength,
      CONFIG.hash.digest
    )
  }

  #deriveEncryptionKey(pin: string, salt: Buffer): Buffer {
    return pbkdf2Sync(pin, salt, CONFIG.encryption.iterations, CONFIG.encryption.keyLength, 'sha256')
  }

  #setDerivedKey(pin: string, salt: Buffer): void {
    this.#clearDerivedKey()
    this.#derivedEncryptionKey = this.#deriveEncryptionKey(pin, salt)
  }

  #clearDerivedKey(): void {
    if (this.#derivedEncryptionKey) {
      this.#derivedEncryptionKey.fill(0)
      this.#derivedEncryptionKey = null
    }
  }

  #updateLockoutInPinData(pinData: PinData): PinData {
    return {
      ...pinData,
      lockout: this.#lockoutManager.serialize()
    }
  }

  #zeroBuffer(buffer: Buffer): void {
    buffer.fill(0)
  }

  // ===========================================================================
  // Public API - PIN Creation
  // ===========================================================================

  public createPinHash(pin: string): string | null {
    const result = this.#createPinHashSafe(pin)
    return result.ok ? result.value : null
  }

  #createPinHashSafe(pin: string): PinOperationResult<string> {
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: 'SafeStorage not available' }
    }

    if (!this.#validatePinFormat(pin)) {
      return { ok: false, error: 'Invalid PIN format' }
    }

    try {
      const salt = randomBytes(CONFIG.salt.length)
      const encryptionSalt = randomBytes(CONFIG.salt.length)
      const hash = this.#hashPin(pin, salt)

      const pinData: PinData = {
        hash: hash.toString('base64'),
        salt: salt.toString('base64'),
        encryptionSalt: encryptionSalt.toString('base64'),
        lockout: this.#lockoutManager.serialize()
      }

      this.#zeroBuffer(hash)
      this.#lockoutManager.reset()

      return this.#encryptPinData(pinData)
    } catch {
      return { ok: false, error: 'Failed to create PIN hash' }
    }
  }

  // ===========================================================================
  // Public API - PIN Verification
  // ===========================================================================

  public verifyPin(enteredPin: string, encryptedData: string): VerifyPinResult {
    const now = Date.now()

    // Validate PIN format first (constant time for format check)
    if (!this.#validatePinFormat(enteredPin)) {
      return {
        success: false,
        locked: false,
        remainingAttempts: CONFIG.rateLimit.maxAttempts
      }
    }

    // Decrypt PIN data once
    const decryptResult = this.#decryptPinData(encryptedData)
    if (!decryptResult.ok) {
      const lockoutSeconds = this.#lockoutManager.applyMaxLockout(now)
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds
      }
    }

    const pinData = decryptResult.value

    // Load and check lockout state
    this.#lockoutManager.loadFromPinData(pinData.lockout)
    this.#lockoutManager.checkAndUpdateExpiry(now)

    const lockCheck = this.#lockoutManager.isLocked(now)
    if (lockCheck.locked) {
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: lockCheck.seconds
      }
    }

    // Perform verification
    return this.#performVerification(enteredPin, pinData, now)
  }

  #performVerification(enteredPin: string, pinData: PinData, now: number): VerifyPinResult {
    const salt = Buffer.from(pinData.salt, 'base64')
    const storedHash = Buffer.from(pinData.hash, 'base64')
    const enteredHash = this.#hashPin(enteredPin, salt)

    let isCorrect: boolean
    try {
      isCorrect = timingSafeEqual(storedHash, enteredHash)
    } finally {
      this.#zeroBuffer(enteredHash)
    }

    if (isCorrect) {
      return this.#handleSuccessfulVerification(enteredPin, pinData)
    }

    return this.#handleFailedVerification(pinData, now)
  }

  #handleSuccessfulVerification(pin: string, pinData: PinData): VerifyPinResult {
    this.#lockoutManager.recordSuccess()
    this.#isPinVerified = true

    if (pinData.encryptionSalt) {
      const encryptionSalt = Buffer.from(pinData.encryptionSalt, 'base64')
      this.#setDerivedKey(pin, encryptionSalt)
    }

    const updatedPinData = this.#updateLockoutInPinData(pinData)
    const encryptResult = this.#encryptPinData(updatedPinData)

    return {
      success: true,
      locked: false,
      remainingAttempts: CONFIG.rateLimit.maxAttempts,
      updatedEncryptedData: encryptResult.ok ? encryptResult.value : undefined
    }
  }

  #handleFailedVerification(pinData: PinData, now: number): VerifyPinResult {
    const failureResult = this.#lockoutManager.recordFailure(now)

    const updatedPinData = this.#updateLockoutInPinData(pinData)
    const encryptResult = this.#encryptPinData(updatedPinData)

    return {
      success: false,
      locked: failureResult.locked,
      remainingAttempts: failureResult.remainingAttempts,
      lockoutSeconds: failureResult.lockoutSeconds,
      updatedEncryptedData: encryptResult.ok ? encryptResult.value : undefined
    }
  }

  // ===========================================================================
  // Public API - PIN Change Verification
  // ===========================================================================

  public verifyCurrentPinForChange(
    currentPin: string,
    encryptedData: string
  ): VerifyPinResult {
    return this.verifyPin(currentPin, encryptedData)
  }

  // ===========================================================================
  // Public API - Lockout Status
  // ===========================================================================

  public getLockoutStatus(encryptedData?: string): LockoutStatus {
    if (encryptedData) {
      const decryptResult = this.#decryptPinData(encryptedData)
      if (!decryptResult.ok) {
        return {
          locked: true,
          lockoutSeconds: Math.ceil(
            (CONFIG.rateLimit.baseLockoutMs * CONFIG.rateLimit.maxLockoutMultiplier) / 1000
          ),
          remainingAttempts: 0
        }
      }
      this.#lockoutManager.loadFromPinData(decryptResult.value.lockout)
    }

    this.#lockoutManager.checkAndUpdateExpiry()
    return this.#lockoutManager.getStatus()
  }

  // ===========================================================================
  // Public API - Encryption/Decryption
  // ===========================================================================

  public getEncryptionSalt(encryptedPinData: string): string | null {
    const result = this.#decryptPinData(encryptedPinData)
    if (!result.ok) return null
    return result.value.encryptionSalt || null
  }

  public encryptWithPin(data: string, pin: string, encryptionSalt: string): string | null {
    try {
      const salt = Buffer.from(encryptionSalt, 'base64')
      const key = this.#deriveEncryptionKey(pin, salt)

      try {
        return this.#encryptWithKey(data, key)
      } finally {
        this.#zeroBuffer(key)
      }
    } catch {
      return null
    }
  }

  public decryptWithPin(encryptedData: string, pin: string, encryptionSalt: string): string | null {
    try {
      const salt = Buffer.from(encryptionSalt, 'base64')
      const key = this.#deriveEncryptionKey(pin, salt)

      try {
        return this.#decryptWithKey(encryptedData, key)
      } finally {
        this.#zeroBuffer(key)
      }
    } catch {
      return null
    }
  }

  public encryptWithVerifiedKey(data: string): string | null {
    if (!this.#derivedEncryptionKey) return null
    return this.#encryptWithKey(data, this.#derivedEncryptionKey)
  }

  public decryptWithVerifiedKey(encryptedData: string): string | null {
    if (!this.#derivedEncryptionKey) return null
    return this.#decryptWithKey(encryptedData, this.#derivedEncryptionKey)
  }

  #encryptWithKey(data: string, key: Buffer): string | null {
    try {
      const iv = randomBytes(CONFIG.encryption.ivLength)
      const cipher = createCipheriv(CONFIG.encryption.algorithm, key, iv)

      let encrypted = cipher.update(data, 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      const authTag = cipher.getAuthTag()

      const combined = Buffer.concat([iv, authTag, encrypted])
      return combined.toString('base64')
    } catch {
      return null
    }
  }

  #decryptWithKey(encryptedData: string, key: Buffer): string | null {
    try {
      const combined = Buffer.from(encryptedData, 'base64')

      const iv = combined.subarray(0, CONFIG.encryption.ivLength)
      const authTag = combined.subarray(
        CONFIG.encryption.ivLength,
        CONFIG.encryption.ivLength + CONFIG.encryption.authTagLength
      )
      const ciphertext = combined.subarray(
        CONFIG.encryption.ivLength + CONFIG.encryption.authTagLength
      )

      const decipher = createDecipheriv(CONFIG.encryption.algorithm, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(ciphertext)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      return null
    }
  }

  // ===========================================================================
  // Public API - Verification State
  // ===========================================================================

  public isPinCurrentlyVerified(): boolean {
    return this.#isPinVerified
  }

  public hasEncryptionKey(): boolean {
    return this.#derivedEncryptionKey !== null
  }

  public markVerified(): void {
    this.#isPinVerified = true
  }

  public clearVerification(): void {
    this.#isPinVerified = false
    this.#clearDerivedKey()
  }

  public resetAttempts(): void {
    this.#lockoutManager.reset()
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

export const pinService = new PinService()
