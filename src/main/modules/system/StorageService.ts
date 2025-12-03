import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { Account, DEFAULT_ACCENT_COLOR } from '../../../renderer/src/types'
import { MultiInstance } from '@main/lib/MultiInstance'
import { z } from 'zod'
import { accountSchema } from '../../../shared/ipc-schemas/user'
import { favoriteItemSchema } from '../../../shared/ipc-schemas/avatar'
import { pinService } from './PinService'

const customFontSchema = z.object({
  family: z.string(),
  url: z.string()
})

const storeDataSchema = z.object({
  sidebarWidth: z.number().optional(),
  sidebarCollapsed: z.boolean().optional(),
  accountsViewMode: z.enum(['list', 'grid']).optional(),
  avatarRenderWidth: z.number().optional(),
  windowWidth: z.number().optional(),
  windowHeight: z.number().optional(),
  accounts: z.array(accountSchema).optional(),
  favoriteGames: z.array(z.string()).optional(),
  favoriteItems: z.array(favoriteItemSchema).optional(),
  excludeFullGames: z.boolean().optional(),
  customFonts: z.array(customFontSchema).optional(),
  activeFont: z.string().nullable().optional(),
  settings: z
    .object({
      primaryAccountId: z.string().nullable().optional(),
      allowMultipleInstances: z.boolean().optional(),
      defaultInstallationPath: z.string().nullable().optional(),
      accentColor: z.string().optional(),
      showSidebarProfileCard: z.boolean().optional(),
      // pinCodeHash stores the encrypted, hashed PIN (not plain text)
      pinCodeHash: z.string().nullable().optional()
    })
    .optional()
})

type StoreData = z.infer<typeof storeDataSchema>

class StorageService {
  private path: string
  private data: StoreData = {}

  constructor() {
    const userDataPath = app.getPath('userData')
    this.path = join(userDataPath, 'config.json')
    this.init()
  }

  private init(): void {
    try {
      if (!existsSync(this.path)) {
        const dir = app.getPath('userData')
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        this.save()
      } else {
        this.load()
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error)
    }
  }

  private load(): void {
    try {
      const fileContent = readFileSync(this.path, 'utf-8')
      const rawData = JSON.parse(fileContent)
      const result = storeDataSchema.safeParse(rawData)

      if (result.success) {
        this.data = result.data
        this.migratePin()
      } else {
        console.error('Storage validation failed:', result.error)
        try {
          const backupPath = this.path + '.bak'
          writeFileSync(backupPath, fileContent)
        } catch (e) {
          console.error('Failed to backup config:', e)
        }
        this.data = {}
      }

      // Apply multi-instance setting
      if (this.data.settings?.allowMultipleInstances) {
        MultiInstance.Enable()
      } else {
        MultiInstance.Disable()
      }
    } catch (error) {
      console.error('Failed to load storage:', error)
      this.data = {}
    }
  }

  private migratePin(): void {
    // Remove any legacy unencrypted PIN data for security
    if (this.data.settings && 'pinCode' in this.data.settings) {
      delete (this.data.settings as any).pinCode
      this.save()
    }
  }

  private save(): void {
    try {
      writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Failed to save storage:', error)
    }
  }

  public getSidebarWidth(): number | undefined {
    return this.data.sidebarWidth
  }

  public setSidebarWidth(width: number): void {
    this.data.sidebarWidth = width
    this.save()
  }

  public getSidebarCollapsed(): boolean {
    return this.data.sidebarCollapsed ?? false
  }

  public setSidebarCollapsed(collapsed: boolean): void {
    this.data.sidebarCollapsed = collapsed
    this.save()
  }

  public getAccountsViewMode(): 'list' | 'grid' {
    return this.data.accountsViewMode ?? 'list'
  }

  public setAccountsViewMode(mode: 'list' | 'grid'): void {
    this.data.accountsViewMode = mode
    this.save()
  }

  public getAccounts(): Account[] {
    const accounts = (this.data.accounts || []) as Account[]
    const pinHash = this.getPinHash()

    // Security check: If a PIN is set, only decrypt cookies if PIN has been verified in main process
    if (pinHash && !pinService.isPinCurrentlyVerified()) {
      // Return accounts without cookies until PIN is verified
      // This is expected behavior on app startup before PIN entry
      return accounts.map((account) => ({
        ...account,
        cookie: undefined // Don't expose cookie data until authenticated
      }))
    }

    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('SafeStorage is not available. Returning accounts without decrypting cookies.')
      return accounts
    }

    // Get encryption salt and verified PIN for PIN-layer decryption
    const encryptionSalt = pinHash ? pinService.getEncryptionSalt(pinHash) : null
    const verifiedPin = pinService.getVerifiedPin()

    return accounts.map((account) => {
      if (account.cookie) {
        try {
          // First, decrypt with safeStorage (OS-level encryption)
          const encryptedBuffer = Buffer.from(account.cookie, 'base64')
          let decryptedCookie = safeStorage.decryptString(encryptedBuffer)

          // If PIN is set and we have the verified PIN, decrypt the PIN layer
          if (pinHash && encryptionSalt && verifiedPin) {
            const pinDecrypted = pinService.decryptWithPin(
              decryptedCookie,
              verifiedPin,
              encryptionSalt
            )
            if (pinDecrypted) {
              decryptedCookie = pinDecrypted
            } else {
              console.warn(
                `PIN decryption failed for account ${account.username}, using OS-decrypted value`
              )
            }
          }

          return { ...account, cookie: decryptedCookie }
        } catch (error) {
          console.error(`Failed to decrypt cookie for account ${account.username}:`, error)
          return account
        }
      }
      return account
    })
  }

  public saveAccounts(accounts: Account[]): void {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('SafeStorage is not available. Cannot securely save accounts.')
      return
    }

    // Get encryption salt and verified PIN for PIN-layer encryption
    const pinHash = this.getPinHash()
    const encryptionSalt = pinHash ? pinService.getEncryptionSalt(pinHash) : null
    const verifiedPin = pinService.getVerifiedPin()

    const encryptedAccounts = accounts.map((account) => {
      if (account.cookie) {
        try {
          let cookieToEncrypt = account.cookie

          // If PIN is set and verified, first encrypt with PIN-derived key
          if (pinHash && encryptionSalt && verifiedPin) {
            const pinEncrypted = pinService.encryptWithPin(
              account.cookie,
              verifiedPin,
              encryptionSalt
            )
            if (pinEncrypted) {
              cookieToEncrypt = pinEncrypted
            } else {
              console.error(`Failed to PIN-encrypt cookie for account ${account.username}`)
              return { ...account, cookie: undefined }
            }
          }

          // Then encrypt with safeStorage (OS-level encryption)
          const encryptedBuffer = safeStorage.encryptString(cookieToEncrypt)
          return { ...account, cookie: encryptedBuffer.toString('base64') }
        } catch (error) {
          console.error(`Failed to encrypt cookie for account ${account.username}:`, error)
          // If encryption fails, we probably shouldn't save the plain cookie.
          return { ...account, cookie: undefined }
        }
      }
      return account
    })

    this.data.accounts = encryptedAccounts as any // Cast to match Zod schema if types mismatch slightly
    this.save()
  }

  public getFavoriteGames(): string[] {
    return this.data.favoriteGames || []
  }

  public addFavoriteGame(placeId: string): void {
    const favorites = this.data.favoriteGames || []
    if (!favorites.includes(placeId)) {
      this.data.favoriteGames = [...favorites, placeId]
      this.save()
    }
  }

  public removeFavoriteGame(placeId: string): void {
    const favorites = this.data.favoriteGames || []
    this.data.favoriteGames = favorites.filter((id) => id !== placeId)
    this.save()
  }

  public getFavoriteItems(): { id: number; name: string; type: string }[] {
    return this.data.favoriteItems || []
  }

  public addFavoriteItem(item: { id: number; name: string; type: string }): void {
    const favorites = this.data.favoriteItems || []
    if (!favorites.some((i) => i.id === item.id)) {
      this.data.favoriteItems = [...favorites, item]
      this.save()
    }
  }

  public removeFavoriteItem(itemId: number): void {
    const favorites = this.data.favoriteItems || []
    this.data.favoriteItems = favorites.filter((i) => i.id !== itemId)
    this.save()
  }

  public getSettings() {
    return {
      primaryAccountId: this.data.settings?.primaryAccountId ?? null,
      allowMultipleInstances: this.data.settings?.allowMultipleInstances ?? false,
      defaultInstallationPath: this.data.settings?.defaultInstallationPath ?? null,
      accentColor: this.data.settings?.accentColor ?? DEFAULT_ACCENT_COLOR,
      showSidebarProfileCard: this.data.settings?.showSidebarProfileCard ?? true,
      // Return whether a PIN is set (never expose actual PIN data)
      pinCode: this.data.settings?.pinCodeHash ? 'SET' : null
    }
  }

  /**
   * Get the raw encrypted PIN hash for verification
   */
  public getPinHash(): string | null {
    return this.data.settings?.pinCodeHash ?? null
  }

  /**
   * Set a new PIN (will be hashed and encrypted)er
   */
  public setPin(
    pin: string | null,
    currentPin?: string
  ): {
    success: boolean
    error?: string
    locked?: boolean
    lockoutSeconds?: number
    remainingAttempts?: number
  } {
    const existingHash = this.getPinHash()

    // If a PIN is already set, require current PIN verification before change/removal
    if (existingHash) {
      if (!currentPin) {
        return { success: false, error: 'Current PIN required to change or remove PIN' }
      }

      // Verify current PIN
      const verifyResult = pinService.verifyCurrentPinForChange(currentPin, existingHash)
      if (!verifyResult.success) {
        // Update stored hash with new lockout state
        if (verifyResult.updatedEncryptedData) {
          if (!this.data.settings) {
            this.data.settings = {}
          }
          this.data.settings.pinCodeHash = verifyResult.updatedEncryptedData
          this.save()
        }
        return {
          success: false,
          error: verifyResult.locked ? 'Too many failed attempts' : 'Incorrect current PIN',
          locked: verifyResult.locked,
          lockoutSeconds: verifyResult.lockoutSeconds,
          remainingAttempts: verifyResult.remainingAttempts
        }
      }
    }

    const decryptedAccounts = this.getAccounts()

    if (pin === null) {
      if (this.data.settings) {
        this.data.settings.pinCodeHash = null
      }
      pinService.resetAttempts()
      pinService.markVerified()

      this.save()
      this.saveAccounts(decryptedAccounts)
      return { success: true }
    }

    const hash = pinService.createPinHash(pin)

    if (!hash) {
      console.error('Secure storage unavailable. PIN will not be stored unencrypted.')
      return { success: false, error: 'Secure storage unavailable' }
    }

    if (!this.data.settings) {
      this.data.settings = {}
    }

    this.data.settings.pinCodeHash = hash

    pinService.markVerified()
    pinService.resetAttempts()

    // Temporarily set the verified PIN in PinService for re-encryption.
    const newEncryptionSalt = pinService.getEncryptionSalt(hash)
    if (newEncryptionSalt && decryptedAccounts.length > 0) {
      this.save()
      this.reEncryptAccountsWithNewPin(decryptedAccounts, pin, newEncryptionSalt)
    } else {
      this.save()
    }

    return { success: true }
  }

  /**
   * Re-encrypt accounts with a new PIN
   * This is used when setting or changing a PIN
   */
  private reEncryptAccountsWithNewPin(
    accounts: Account[],
    pin: string,
    encryptionSalt: string
  ): void {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('SafeStorage is not available. Cannot re-encrypt accounts.')
      return
    }

    const encryptedAccounts = accounts.map((account) => {
      if (account.cookie) {
        try {
          // First encrypt with PIN-derived key
          const pinEncrypted = pinService.encryptWithPin(account.cookie, pin, encryptionSalt)
          if (!pinEncrypted) {
            console.error(`Failed to PIN-encrypt cookie for account ${account.username}`)
            return { ...account, cookie: undefined }
          }

          // Then encrypt with safeStorage (OS-level encryption)
          const encryptedBuffer = safeStorage.encryptString(pinEncrypted)
          return { ...account, cookie: encryptedBuffer.toString('base64') }
        } catch (error) {
          console.error(`Failed to re-encrypt cookie for account ${account.username}:`, error)
          return { ...account, cookie: undefined }
        }
      }
      return account
    })

    this.data.accounts = encryptedAccounts as any
    this.save()
  }

  /**
   * Verify a PIN attempt for app unlock
   */
  public verifyPin(pin: string): {
    success: boolean
    locked: boolean
    remainingAttempts: number
    lockoutSeconds?: number
  } {
    const hash = this.getPinHash()

    // No PIN hash means no PIN is set
    if (!hash) {
      return { success: false, locked: false, remainingAttempts: 5 }
    }

    const result = pinService.verifyPin(pin, hash)

    // Update stored hash with new lockout state if changed
    if (result.updatedEncryptedData) {
      if (!this.data.settings) {
        this.data.settings = {}
      }
      this.data.settings.pinCodeHash = result.updatedEncryptedData
      this.save()
    }

    return {
      success: result.success,
      locked: result.locked,
      remainingAttempts: result.remainingAttempts,
      lockoutSeconds: result.lockoutSeconds
    }
  }

  /**
   * Check if PIN is currently verified (delegates to PinService)
   */
  public isPinCurrentlyVerified(): boolean {
    return pinService.isPinCurrentlyVerified()
  }

  /**
   * Get PIN lockout status
   */
  public getPinLockoutStatus(): {
    locked: boolean
    lockoutSeconds?: number
    remainingAttempts: number
  } {
    const hash = this.getPinHash()
    return pinService.getLockoutStatus(hash || undefined)
  }

  public setSettings(settings: {
    primaryAccountId?: string | null
    allowMultipleInstances?: boolean
    defaultInstallationPath?: string | null
    accentColor?: string
    showSidebarProfileCard?: boolean
    pinCode?: string | null
  }): void {
    const nextSettings = { ...this.getSettings() }

    if ('primaryAccountId' in settings) {
      nextSettings.primaryAccountId = settings.primaryAccountId ?? null
    }

    if ('allowMultipleInstances' in settings) {
      nextSettings.allowMultipleInstances = !!settings.allowMultipleInstances
    }

    if ('defaultInstallationPath' in settings) {
      nextSettings.defaultInstallationPath = settings.defaultInstallationPath ?? null
    }

    if ('accentColor' in settings && typeof settings.accentColor === 'string') {
      nextSettings.accentColor = settings.accentColor
    }

    if ('showSidebarProfileCard' in settings) {
      nextSettings.showSidebarProfileCard = !!settings.showSidebarProfileCard
    }

    // Handle PIN separately through setPin method
    if ('pinCode' in settings) {
      this.setPin(settings.pinCode ?? null)
    }

    // Update other settings (excluding pinCode which is handled above)
    const { pinCode: _, ...settingsWithoutPin } = nextSettings
    this.data.settings = {
      ...this.data.settings,
      ...settingsWithoutPin
    }
    this.save()

    if (nextSettings.allowMultipleInstances) {
      MultiInstance.Enable()
    } else {
      MultiInstance.Disable()
    }
  }

  public getExcludeFullGames(): boolean {
    return this.data.excludeFullGames ?? false
  }

  public setExcludeFullGames(excludeFullGames: boolean): void {
    this.data.excludeFullGames = excludeFullGames
    this.save()
  }

  public getAvatarRenderWidth(): number | undefined {
    return this.data.avatarRenderWidth
  }

  public setAvatarRenderWidth(width: number): void {
    this.data.avatarRenderWidth = width
    this.save()
  }

  public getWindowWidth(): number | undefined {
    return this.data.windowWidth
  }

  public setWindowWidth(width: number): void {
    this.data.windowWidth = width
    this.save()
  }

  public getWindowHeight(): number | undefined {
    return this.data.windowHeight
  }

  public setWindowHeight(height: number): void {
    this.data.windowHeight = height
    this.save()
  }

  public getCustomFonts(): { family: string; url: string }[] {
    return this.data.customFonts || []
  }

  public addCustomFont(font: { family: string; url: string }): void {
    const fonts = this.data.customFonts || []
    // Don't add duplicate fonts
    if (!fonts.some((f) => f.family === font.family)) {
      this.data.customFonts = [...fonts, font]
      this.save()
    }
  }

  public removeCustomFont(family: string): void {
    const fonts = this.data.customFonts || []
    this.data.customFonts = fonts.filter((f) => f.family !== family)
    // If the active font was removed, reset to default
    if (this.data.activeFont === family) {
      this.data.activeFont = null
    }
    this.save()
  }

  public getActiveFont(): string | null {
    return this.data.activeFont ?? null
  }

  public setActiveFont(family: string | null): void {
    this.data.activeFont = family
    this.save()
  }
}

export const storageService = new StorageService()
