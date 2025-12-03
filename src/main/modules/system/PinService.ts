import { safeStorage } from 'electron'
import { randomBytes, pbkdf2Sync, timingSafeEqual, createCipheriv, createDecipheriv } from 'crypto'

// Security constants
const SALT_LENGTH = 32
const HASH_ITERATIONS = 350000 // High iteration count for security
const HASH_KEY_LENGTH = 64
const HASH_DIGEST = 'sha512'

// PIN encryption constants (for cookie encryption layer)
const PIN_ENCRYPTION_KEY_LENGTH = 32 // 256 bits for AES-256
const PIN_ENCRYPTION_IV_LENGTH = 16 // 128 bits for AES-GCM
const PIN_ENCRYPTION_AUTH_TAG_LENGTH = 16 // 128 bits for GCM auth tag
const PIN_ENCRYPTION_ITERATIONS = 50000 // Fewer iterations since this is secondary encryption
const PIN_ENCRYPTION_ALGORITHM = 'aes-256-gcm'

// Rate limiting with progressive lockouts
const MAX_ATTEMPTS = 5
const BASE_LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutes base lockout
const ATTEMPT_RESET_MS = 15 * 60 * 1000 // Reset attempts after 15 minutes of no activity
const MAX_LOCKOUT_MULTIPLIER = 12 // Max 1 hour lockout (5 * 12 = 60 minutes)

interface PinData {
  hash: string // Base64 encoded hash
  salt: string // Base64 encoded salt
  encryptionSalt?: string // Base64 encoded salt for deriving encryption key (separate from hash salt)
  // Lockout state stored with PIN to prevent file deletion bypass
  lockout?: {
    count: number
    lastAttempt: number
    lockedUntil: number | null
    lockoutCount: number // Number of times lockout has been triggered (for progressive lockouts)
  }
}

interface AttemptTracker {
  count: number
  lastAttempt: number
  lockedUntil: number | null
  lockoutCount: number // Progressive lockout multiplier
}

class PinService {
  private attemptTracker: AttemptTracker = {
    count: 0,
    lastAttempt: 0,
    lockedUntil: null,
    lockoutCount: 0
  }
  private isPinVerified: boolean = false // Auth state managed in main process only
  private verifiedPin: string | null = null // Store verified PIN for encryption/decryption (memory only)

  /**
   * Initialize the PIN service
   */
  public initialize(): void {
    // Auth state starts as false - user must verify PIN on each app launch
    this.isPinVerified = false
    this.verifiedPin = null
  }

  /**
   * Derive an encryption key from the PIN using PBKDF2
   */
  private deriveEncryptionKey(pin: string, salt: Buffer): Buffer {
    return pbkdf2Sync(pin, salt, PIN_ENCRYPTION_ITERATIONS, PIN_ENCRYPTION_KEY_LENGTH, 'sha256')
  }

  /**
   * Get the encryption salt from stored PIN data
   */
  public getEncryptionSalt(encryptedPinData: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }

    try {
      const encryptedBuffer = Buffer.from(encryptedPinData, 'base64')
      const decryptedJson = safeStorage.decryptString(encryptedBuffer)
      const pinData: PinData = JSON.parse(decryptedJson)
      return pinData.encryptionSalt || null
    } catch (error) {
      console.error('Failed to get encryption salt:', error)
      return null
    }
  }

  /**
   * Encrypt data using the PIN-derived key
   * Returns base64 encoded string: IV + AuthTag + CipherText
   */
  public encryptWithPin(data: string, pin: string, encryptionSalt: string): string | null {
    try {
      const salt = Buffer.from(encryptionSalt, 'base64')
      const key = this.deriveEncryptionKey(pin, salt)
      const iv = randomBytes(PIN_ENCRYPTION_IV_LENGTH)

      const cipher = createCipheriv(PIN_ENCRYPTION_ALGORITHM, key, iv)
      let encrypted = cipher.update(data, 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      const authTag = cipher.getAuthTag()

      // Combine IV + AuthTag + CipherText
      const combined = Buffer.concat([iv, authTag, encrypted])
      return combined.toString('base64')
    } catch (error) {
      console.error('Failed to encrypt with PIN:', error)
      return null
    }
  }

  /**
   * Decrypt data using the PIN-derived key
   */
  public decryptWithPin(encryptedData: string, pin: string, encryptionSalt: string): string | null {
    try {
      const salt = Buffer.from(encryptionSalt, 'base64')
      const key = this.deriveEncryptionKey(pin, salt)
      const combined = Buffer.from(encryptedData, 'base64')

      // Extract IV, AuthTag, and CipherText
      const iv = combined.subarray(0, PIN_ENCRYPTION_IV_LENGTH)
      const authTag = combined.subarray(
        PIN_ENCRYPTION_IV_LENGTH,
        PIN_ENCRYPTION_IV_LENGTH + PIN_ENCRYPTION_AUTH_TAG_LENGTH
      )
      const ciphertext = combined.subarray(
        PIN_ENCRYPTION_IV_LENGTH + PIN_ENCRYPTION_AUTH_TAG_LENGTH
      )

      const decipher = createDecipheriv(PIN_ENCRYPTION_ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(ciphertext)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString('utf8')
    } catch (error) {
      console.error('Failed to decrypt with PIN:', error)
      return null
    }
  }

  /**
   * Get the currently verified PIN (for encryption operations)
   * This is only available after successful PIN verification
   */
  public getVerifiedPin(): string | null {
    return this.verifiedPin
  }

  /**
   * Set the verified PIN (called after successful verification)
   */
  private setVerifiedPin(pin: string): void {
    this.verifiedPin = pin
  }

  /**
   * Clear the verified PIN from memory
   */
  private clearVerifiedPin(): void {
    this.verifiedPin = null
  }

  /**
   * Calculate lockout duration based on number of consecutive lockouts
   * Progressive: 5min -> 10min -> 15min -> ... -> 60min max
   */
  private calculateLockoutDuration(): number {
    const multiplier = Math.min(this.attemptTracker.lockoutCount + 1, MAX_LOCKOUT_MULTIPLIER)
    return BASE_LOCKOUT_DURATION_MS * multiplier
  }

  /**
   * Hash a PIN with a salt using PBKDF2
   */
  private hashPin(pin: string, salt: Buffer): Buffer {
    return pbkdf2Sync(pin, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST)
  }

  /**
   * Load lockout state from stored PIN data
   */
  private loadLockoutFromPinData(pinData: PinData): void {
    // If no lockout data exists, start fresh
    if (!pinData.lockout) {
      this.attemptTracker = {
        count: 0,
        lastAttempt: 0,
        lockedUntil: null,
        lockoutCount: 0
      }
      return
    }

    const now = Date.now()
    const lockout = pinData.lockout

    // Validate lockout state - if invalid, start fresh
    if (
      typeof lockout.count !== 'number' ||
      typeof lockout.lastAttempt !== 'number' ||
      typeof lockout.lockoutCount !== 'number'
    ) {
      this.attemptTracker = {
        count: 0,
        lastAttempt: 0,
        lockedUntil: null,
        lockoutCount: 0
      }
      return
    }

    // Check if lockout has expired
    if (lockout.lockedUntil && now >= lockout.lockedUntil) {
      // Lockout expired, reset count but keep lockoutCount for progressive lockouts
      this.attemptTracker = {
        count: 0,
        lastAttempt: 0,
        lockedUntil: null,
        lockoutCount: lockout.lockoutCount
      }
    } else if (lockout.lastAttempt && now - lockout.lastAttempt > ATTEMPT_RESET_MS) {
      // Attempts should be reset due to inactivity (15 min), reset everything including progressive lockout
      this.attemptTracker = {
        count: 0,
        lastAttempt: 0,
        lockedUntil: null,
        lockoutCount: 0
      }
    } else {
      // Load the stored state as-is
      this.attemptTracker = {
        count: lockout.count,
        lastAttempt: lockout.lastAttempt,
        lockedUntil: lockout.lockedUntil,
        lockoutCount: lockout.lockoutCount
      }
    }
  }

  /**
   * Create a secure PIN hash with a random salt
   * Returns the encrypted data to store
   */
  public createPinHash(pin: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('SafeStorage is not available. Cannot securely store PIN.')
      return null
    }

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      console.error('Invalid PIN format')
      return null
    }

    try {
      // Generate random salt for hashing
      const salt = randomBytes(SALT_LENGTH)

      // Generate separate salt for encryption key derivation
      const encryptionSalt = randomBytes(SALT_LENGTH)

      // Hash the PIN
      const hash = this.hashPin(pin, salt)

      // Create PIN data object with reset lockout state
      const pinData: PinData = {
        hash: hash.toString('base64'),
        salt: salt.toString('base64'),
        encryptionSalt: encryptionSalt.toString('base64'),
        lockout: {
          count: 0,
          lastAttempt: 0,
          lockedUntil: null,
          lockoutCount: 0
        }
      }

      // Convert to JSON and encrypt using OS-level encryption
      const jsonData = JSON.stringify(pinData)
      const encrypted = safeStorage.encryptString(jsonData)

      // Reset in-memory tracker
      this.attemptTracker = {
        count: 0,
        lastAttempt: 0,
        lockedUntil: null,
        lockoutCount: 0
      }

      return encrypted.toString('base64')
    } catch (error) {
      console.error('Failed to create PIN hash:', error)
      return null
    }
  }

  /**
   * Update the lockout state in the stored PIN data
   * Returns the updated encrypted data
   */
  private updateLockoutInPinData(encryptedData: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }

    try {
      const encryptedBuffer = Buffer.from(encryptedData, 'base64')
      const decryptedJson = safeStorage.decryptString(encryptedBuffer)
      const pinData: PinData = JSON.parse(decryptedJson)

      // Update lockout state
      pinData.lockout = {
        count: this.attemptTracker.count,
        lastAttempt: this.attemptTracker.lastAttempt,
        lockedUntil: this.attemptTracker.lockedUntil,
        lockoutCount: this.attemptTracker.lockoutCount
      }

      // Re-encrypt
      const jsonData = JSON.stringify(pinData)
      const encrypted = safeStorage.encryptString(jsonData)
      return encrypted.toString('base64')
    } catch (error) {
      console.error('Failed to update lockout in PIN data:', error)
      return null
    }
  }

  /**
   * Verify a PIN against stored encrypted hash
   * Returns verification result and updated encrypted data (if lockout state changed)
   */
  public verifyPin(
    enteredPin: string,
    encryptedData: string
  ): {
    success: boolean
    locked: boolean
    remainingAttempts: number
    lockoutSeconds?: number
    updatedEncryptedData?: string
  } {
    const now = Date.now()

    // First, load lockout state from PIN data
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = Buffer.from(encryptedData, 'base64')
        const decryptedJson = safeStorage.decryptString(encryptedBuffer)
        const pinData: PinData = JSON.parse(decryptedJson)
        this.loadLockoutFromPinData(pinData)
      }
    } catch (error) {
      console.error('Failed to load PIN data, assuming tampering:', error)
      // If decryption fails, assume tampering and apply max lockout
      const lockoutDuration = BASE_LOCKOUT_DURATION_MS * MAX_LOCKOUT_MULTIPLIER
      this.attemptTracker = {
        count: MAX_ATTEMPTS,
        lastAttempt: now,
        lockedUntil: now + lockoutDuration,
        lockoutCount: MAX_LOCKOUT_MULTIPLIER
      }
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(lockoutDuration / 1000)
      }
    }

    // Check if locked out
    if (this.attemptTracker.lockedUntil) {
      if (now < this.attemptTracker.lockedUntil) {
        const lockoutSeconds = Math.ceil((this.attemptTracker.lockedUntil - now) / 1000)
        return { success: false, locked: true, remainingAttempts: 0, lockoutSeconds }
      } else {
        // Lockout expired, reset attempts but keep lockoutCount
        this.attemptTracker.lockedUntil = null
        this.attemptTracker.count = 0
      }
    }

    // Reset attempt count if enough time has passed since last attempt
    if (
      this.attemptTracker.lastAttempt &&
      now - this.attemptTracker.lastAttempt > ATTEMPT_RESET_MS
    ) {
      this.attemptTracker.count = 0
      this.attemptTracker.lastAttempt = 0
      // Also reset lockout multiplier after extended period of no activity
      this.attemptTracker.lockoutCount = 0
    }

    if (!safeStorage.isEncryptionAvailable()) {
      console.error('SafeStorage is not available')
      return { success: false, locked: false, remainingAttempts: MAX_ATTEMPTS }
    }

    try {
      // Decrypt the stored data
      const encryptedBuffer = Buffer.from(encryptedData, 'base64')
      const decryptedJson = safeStorage.decryptString(encryptedBuffer)
      const pinData: PinData = JSON.parse(decryptedJson)

      // Recreate the hash with the stored salt
      const salt = Buffer.from(pinData.salt, 'base64')
      const storedHash = Buffer.from(pinData.hash, 'base64')
      const enteredHash = this.hashPin(enteredPin, salt)

      // Use timing-safe comparison to prevent timing attacks
      const isCorrect = timingSafeEqual(storedHash, enteredHash)

      if (isCorrect) {
        // Reset attempt counter and lockout multiplier on successful login
        this.attemptTracker.count = 0
        this.attemptTracker.lastAttempt = 0
        this.attemptTracker.lockedUntil = null
        this.attemptTracker.lockoutCount = 0 // Reset progressive lockout on success

        // Mark as verified in main process and store PIN for encryption
        this.isPinVerified = true
        this.setVerifiedPin(enteredPin)

        const updatedEncryptedData = this.updateLockoutInPinData(encryptedData)
        return {
          success: true,
          locked: false,
          remainingAttempts: MAX_ATTEMPTS,
          updatedEncryptedData: updatedEncryptedData || undefined
        }
      } else {
        // Increment failed attempt counter
        this.attemptTracker.count++
        this.attemptTracker.lastAttempt = now

        const remainingAttempts = MAX_ATTEMPTS - this.attemptTracker.count

        // Check if should lock out
        if (this.attemptTracker.count >= MAX_ATTEMPTS) {
          // Increment lockout count for progressive lockouts
          this.attemptTracker.lockoutCount = Math.min(
            this.attemptTracker.lockoutCount + 1,
            MAX_LOCKOUT_MULTIPLIER
          )
          const lockoutDuration = this.calculateLockoutDuration()
          this.attemptTracker.lockedUntil = now + lockoutDuration

          const updatedEncryptedData = this.updateLockoutInPinData(encryptedData)
          const lockoutSeconds = Math.ceil(lockoutDuration / 1000)
          return {
            success: false,
            locked: true,
            remainingAttempts: 0,
            lockoutSeconds,
            updatedEncryptedData: updatedEncryptedData || undefined
          }
        }

        const updatedEncryptedData = this.updateLockoutInPinData(encryptedData)
        return {
          success: false,
          locked: false,
          remainingAttempts,
          updatedEncryptedData: updatedEncryptedData || undefined
        }
      }
    } catch (error) {
      console.error('Failed to verify PIN:', error)
      return {
        success: false,
        locked: false,
        remainingAttempts: MAX_ATTEMPTS - this.attemptTracker.count
      }
    }
  }

  /**
   * Get current lockout status from stored PIN data
   */
  public getLockoutStatus(encryptedData?: string): {
    locked: boolean
    lockoutSeconds?: number
    remainingAttempts: number
  } {
    const now = Date.now()

    // Load lockout state from PIN data if provided
    if (encryptedData && safeStorage.isEncryptionAvailable()) {
      try {
        const encryptedBuffer = Buffer.from(encryptedData, 'base64')
        const decryptedJson = safeStorage.decryptString(encryptedBuffer)
        const pinData: PinData = JSON.parse(decryptedJson)
        this.loadLockoutFromPinData(pinData)
      } catch (error) {
        // If decryption fails, assume tampering and apply lockout
        return {
          locked: true,
          lockoutSeconds: Math.ceil((BASE_LOCKOUT_DURATION_MS * MAX_LOCKOUT_MULTIPLIER) / 1000),
          remainingAttempts: 0
        }
      }
    }

    // Check if lockout expired
    if (this.attemptTracker.lockedUntil) {
      if (now < this.attemptTracker.lockedUntil) {
        const lockoutSeconds = Math.ceil((this.attemptTracker.lockedUntil - now) / 1000)
        return { locked: true, lockoutSeconds, remainingAttempts: 0 }
      } else {
        // Lockout expired
        this.attemptTracker.lockedUntil = null
        this.attemptTracker.count = 0
      }
    }

    // Check if attempts should be reset due to inactivity
    if (
      this.attemptTracker.lastAttempt &&
      now - this.attemptTracker.lastAttempt > ATTEMPT_RESET_MS
    ) {
      this.attemptTracker.count = 0
      this.attemptTracker.lastAttempt = 0
      this.attemptTracker.lockoutCount = 0
    }

    return { locked: false, remainingAttempts: MAX_ATTEMPTS - this.attemptTracker.count }
  }

  /**
   * Reset the attempt tracker (called when PIN is removed/changed after successful verification)
   */
  public resetAttempts(): void {
    this.attemptTracker = {
      count: 0,
      lastAttempt: 0,
      lockedUntil: null,
      lockoutCount: 0
    }
  }

  /**
   * Check if PIN is currently verified (auth state in main process)
   */
  public isPinCurrentlyVerified(): boolean {
    return this.isPinVerified
  }

  /**
   * Mark PIN as verified (only called internally after successful verification)
   * This is intentionally NOT exposed via IPC to prevent bypass
   */
  public markVerified(): void {
    this.isPinVerified = true
  }

  /**
   * Clear PIN verification state (called on app restart or explicit logout)
   * Note: This is intentionally NOT exposed via IPC to prevent bypass
   */
  public clearVerification(): void {
    this.isPinVerified = false
    this.clearVerifiedPin()
  }

  /**
   * Verify the current PIN before allowing PIN change/removal
   * This prevents unauthorized PIN modifications
   */
  public verifyCurrentPinForChange(
    currentPin: string,
    encryptedData: string
  ): {
    success: boolean
    locked: boolean
    lockoutSeconds?: number
    remainingAttempts: number
    updatedEncryptedData?: string
  } {
    // Use the same verification logic
    return this.verifyPin(currentPin, encryptedData)
  }
}

export const pinService = new PinService()
