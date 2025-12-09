import {
  accountSettingsJsonSchema,
  userSettingsAndOptionsSchema,
  descriptionResponseSchema,
  genderResponseSchema,
  birthdateResponseSchema,
  promotionChannelsResponseSchema,
  starCodeAffiliateResponseSchema,
  type AccountSettingsJson,
  type UserSettingsAndOptions,
  type PrivacyLevel,
  type TradePrivacy,
  type TradeValue,
  type ContentRestrictionLevel,
  type RedeemPromoCodeResponse,
  type DescriptionResponse,
  type GenderResponse,
  type BirthdateResponse,
  type PromotionChannelsResponse,
  type StarCodeAffiliateResponse
} from '@shared/ipc-schemas/accountSettings'

const ACCOUNT_SETTINGS_API_URL = 'https://accountsettings.roblox.com/v1'
const ACCOUNT_INFO_API_URL = 'https://accountinformation.roblox.com/v1'
const ROBLOX_BASE_URL = 'https://www.roblox.com'
const USER_SETTINGS_API_URL = 'https://apis.roblox.com/user-settings-api/v1/user-settings'
const BILLING_API_URL = 'https://billing.roblox.com/v1'

/**
 * Fetches CSRF token for authenticated requests
 */
async function getCsrfToken(cookie: string): Promise<string> {
  const response = await fetch('https://auth.roblox.com/v2/logout', {
    method: 'POST',
    headers: {
      Cookie: `.ROBLOSECURITY=${cookie}`
    }
  })
  return response.headers.get('x-csrf-token') || ''
}

/**
 * Service for fetching and updating Roblox account settings
 */
export class AccountSettingsService {
  /**
   * Fetches the account settings JSON from /my/settings/json
   */
  static async getAccountSettingsJson(cookie: string): Promise<AccountSettingsJson> {
    const response = await fetch(`${ROBLOX_BASE_URL}/my/settings/json`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch account settings: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return accountSettingsJsonSchema.parse(data)
  }

  /**
   * Fetches the user settings and options from /user-settings-api
   */
  static async getUserSettingsAndOptions(cookie: string): Promise<UserSettingsAndOptions> {
    const response = await fetch(`${USER_SETTINGS_API_URL}/settings-and-options`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return userSettingsAndOptionsSchema.parse(data)
  }

  /**
   * Fetches both account settings and user settings in parallel
   */
  static async getCombinedSettings(
    cookie: string
  ): Promise<{ accountSettings: AccountSettingsJson; userSettings: UserSettingsAndOptions }> {
    const [accountSettings, userSettings] = await Promise.all([
      this.getAccountSettingsJson(cookie),
      this.getUserSettingsAndOptions(cookie)
    ])

    return { accountSettings, userSettings }
  }

  // ============================================================================
  // UPDATE METHODS
  // ============================================================================

  /**
   * Updates the user's inventory privacy setting
   */
  static async updateInventoryPrivacy(
    cookie: string,
    inventoryPrivacy: PrivacyLevel
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/inventory-privacy`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ inventoryPrivacy })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's trade privacy setting
   */
  static async updateTradePrivacy(
    cookie: string,
    tradePrivacy: TradePrivacy
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/trade-privacy`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ tradePrivacy })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's trade value/quality filter setting
   */
  static async updateTradeValue(
    cookie: string,
    tradeValue: TradeValue
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/trade-value`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ tradeValue })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's app chat privacy setting
   */
  static async updateAppChatPrivacy(
    cookie: string,
    appChatPrivacy: PrivacyLevel
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/app-chat-privacy`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ appChatPrivacy })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's game chat privacy setting
   */
  static async updateGameChatPrivacy(
    cookie: string,
    gameChatPrivacy: PrivacyLevel
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/game-chat-privacy`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ gameChatPrivacy })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's phone discovery/privacy setting
   */
  static async updatePrivacy(
    cookie: string,
    phoneDiscovery: PrivacyLevel
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/privacy`, {
      method: 'PATCH',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ phoneDiscovery })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's theme type
   */
  static async updateTheme(
    cookie: string,
    userId: number,
    themeType: string
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/themes/User/${userId}`, {
      method: 'PATCH',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ themeType })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Updates the user's content restriction level
   */
  static async updateContentRestriction(
    cookie: string,
    contentRestrictionLevel: ContentRestrictionLevel
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/content-restriction`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ contentRestrictionLevel })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Sends a verification email
   */
  static async sendVerificationEmail(
    cookie: string,
    freeItem = false
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/email/verify`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ freeItem })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Gets available theme types
   */
  static async getThemeTypes(cookie: string): Promise<string[]> {
    const response = await fetch(`${ACCOUNT_SETTINGS_API_URL}/themes/types`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch theme types: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * Redeems a promo code
   */
  static async redeemPromoCode(cookie: string, code: string): Promise<RedeemPromoCodeResponse> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${BILLING_API_URL}/promocodes/redeem`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ code })
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        success: false,
        errorMsg:
          data.errorMsg || data.message || `Error ${response.status}: ${response.statusText}`
      }
    }

    return {
      success: data.success ?? true,
      successMsg: data.successMsg,
      errorMsg: data.errorMsg
    }
  }

  // ============================================================================
  // ACCOUNT INFORMATION API METHODS
  // ============================================================================

  /**
   * Gets the user's description
   */
  static async getDescription(cookie: string): Promise<DescriptionResponse> {
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/description`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch description: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return descriptionResponseSchema.parse(data)
  }

  /**
   * Updates the user's description
   */
  static async updateDescription(
    cookie: string,
    description: string
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/description`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ description })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Gets the user's gender
   */
  static async getGender(cookie: string): Promise<GenderResponse> {
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/gender`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch gender: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return genderResponseSchema.parse(data)
  }

  /**
   * Updates the user's gender
   */
  static async updateGender(
    cookie: string,
    gender: string
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/gender`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ gender })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Gets the user's birthdate
   */
  static async getBirthdate(cookie: string): Promise<BirthdateResponse> {
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/birthdate`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch birthdate: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return birthdateResponseSchema.parse(data)
  }

  /**
   * Updates the user's birthdate
   */
  static async updateBirthdate(
    cookie: string,
    birthMonth: number,
    birthDay: number,
    birthYear: number
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/birthdate`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ birthMonth, birthDay, birthYear })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Gets the user's promotion channels (social links)
   */
  static async getPromotionChannels(cookie: string): Promise<PromotionChannelsResponse> {
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/promotion-channels`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch promotion channels: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return promotionChannelsResponseSchema.parse(data)
  }

  /**
   * Updates the user's promotion channels (social links)
   */
  static async updatePromotionChannels(
    cookie: string,
    channels: {
      facebook?: string
      twitter?: string
      youtube?: string
      twitch?: string
      promotionChannelsVisibilityPrivacy?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/promotion-channels`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify(channels)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }

  /**
   * Gets the user's star code affiliate
   */
  static async getStarCodeAffiliate(cookie: string): Promise<StarCodeAffiliateResponse | null> {
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/star-code-affiliates`, {
      method: 'GET',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        Accept: 'application/json'
      }
    })

    // API returns 404 or empty body when no affiliate is set
    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch star code affiliate: ${response.status} ${response.statusText}`
      )
    }

    const text = await response.text()

    // Handle empty response body
    if (!text || text.trim() === '' || text.trim() === 'null') {
      return null
    }

    try {
      const data = JSON.parse(text)
      // If data is null, empty object, or doesn't have required fields, return null
      if (!data || !data.userId || !data.name || !data.code) {
        return null
      }
      return starCodeAffiliateResponseSchema.parse(data)
    } catch {
      return null
    }
  }

  /**
   * Adds a star code affiliate supporter
   */
  static async addStarCodeAffiliate(
    cookie: string,
    code: string
  ): Promise<{ success: boolean; affiliate?: StarCodeAffiliateResponse; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/star-code-affiliates`, {
      method: 'POST',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({ code })
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { success: false, error: data.errors?.[0]?.message || response.statusText }
    }

    return {
      success: true,
      affiliate: starCodeAffiliateResponseSchema.parse(data)
    }
  }

  /**
   * Removes the star code affiliate supporter
   */
  static async removeStarCodeAffiliate(
    cookie: string
  ): Promise<{ success: boolean; error?: string }> {
    const csrfToken = await getCsrfToken(cookie)
    const response = await fetch(`${ACCOUNT_INFO_API_URL}/star-code-affiliates`, {
      method: 'DELETE',
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        'X-CSRF-TOKEN': csrfToken
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.errors?.[0]?.message || response.statusText }
    }
    return { success: true }
  }
}
