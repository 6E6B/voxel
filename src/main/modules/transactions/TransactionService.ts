import {
  RedeemPromoCodeResponse,
} from '@shared/contracts/transactions'

const BILLING_API_URL = 'https://billing.roblox.com/v1'

async function getCsrfToken(cookie: string): Promise<string> {
  const response = await fetch('https://auth.roblox.com/v2/logout', {
    method: 'POST',
    headers: {
      Cookie: `.ROBLOSECURITY=${cookie}`
    }
  })

  return response.headers.get('x-csrf-token') || ''
}

export class TransactionService {
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
}
