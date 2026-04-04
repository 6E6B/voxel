import { safeRequest, RequestError, request } from '@main/lib/request'
import { quickLoginCodeSchema, quickLoginStatusSchema } from '@shared/contracts/auth'

export class RobloxAuthService {
  private static readonly QUICK_LOGIN_LOG_PREFIX = '[RobloxQuickLogin]'

  private static log(message: string, details?: Record<string, unknown>): void {
    if (details && Object.keys(details).length > 0) {
      console.log(`${this.QUICK_LOGIN_LOG_PREFIX} ${message}`, details)
      return
    }

    console.log(`${this.QUICK_LOGIN_LOG_PREFIX} ${message}`)
  }

  private static logError(
    message: string,
    error: unknown,
    details?: Record<string, unknown>
  ): void {
    const errorDetails = {
      ...(details ?? {}),
      ...(error instanceof RequestError
        ? {
          errorName: error.name,
          errorMessage: error.message,
          statusCode: error.statusCode,
          hasCsrfToken: Boolean(error.headers?.['x-csrf-token']),
          bodyPreview:
            typeof error.body === 'string'
              ? error.body.slice(0, 160)
              : error.body === undefined
                ? undefined
                : String(error.body).slice(0, 160)
        }
        : error instanceof Error
          ? {
            errorName: error.name,
            errorMessage: error.message
          }
          : {
            errorValue: String(error)
          })
    }

    console.error(`${this.QUICK_LOGIN_LOG_PREFIX} ${message}`, errorDetails)
  }

  private static quickLoginAttemptDetails(
    code: string,
    privateKey: string
  ): Record<string, unknown> {
    return {
      codeLength: code.length,
      privateKeyLength: privateKey.length
    }
  }

  private static extractSecurityCookie(headers?: Record<string, string | string[]>): string | null {
    const setCookie = headers?.['set-cookie']
    if (!setCookie) {
      return null
    }

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
    const securityCookie = cookies.find((cookie) => cookie.includes('.ROBLOSECURITY'))
    if (!securityCookie) {
      return null
    }

    const match = securityCookie.match(/\.ROBLOSECURITY=([^;]+)/)
    return match?.[1] ?? null
  }

  private static getHeaderKeys(headers?: Record<string, string | string[]>): string[] {
    return headers ? Object.keys(headers) : []
  }

  static extractCookie(cookie: string): string {
    let cookieValue = cookie.trim()
    const match = cookieValue.match(/\.ROBLOSECURITY=([^;]+)/)
    if (match) {
      cookieValue = match[1]
    }
    return cookieValue
  }

  static validateCookieFormat(cookie: string): void {
    const expectedStart =
      '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_'
    if (!cookie.startsWith(expectedStart)) {
      throw new Error(
        'Invalid cookie format. The cookie must start with the Roblox security warning.'
      )
    }
  }

  static async getCsrfToken(cookie: string): Promise<string> {
    const normalizedCookie = this.extractCookie(cookie)
    const csrfBootstrapUrls = [
      'https://auth.roblox.com/v2/logout',
      'https://auth.roblox.com/v2/login'
    ]

    let lastError: unknown = null

    for (const url of csrfBootstrapUrls) {
      try {
        const result = await safeRequest<{ data: unknown; headers: Record<string, string | string[]> }>({
          method: 'POST',
          url,
          cookie: normalizedCookie,
          skipHba: true,
          headers: {
            Origin: 'https://www.roblox.com',
            Referer: 'https://www.roblox.com/'
          },
          returnHeaders: true
        })

        const token = result.headers['x-csrf-token']
        if (token) {
          return Array.isArray(token) ? token[0] : (token as string)
        }
      } catch (error) {
        lastError = error

        if (error instanceof RequestError && error.headers) {
          const token = error.headers['x-csrf-token']
          if (token) {
            return Array.isArray(token) ? token[0] : (token as string)
          }
        }
      }
    }

    this.logError('Failed to retrieve CSRF token', lastError ?? new Error('Unknown CSRF failure'))
    throw new Error('Failed to retrieve CSRF token')
  }

  static async getAuthenticationTicket(cookie: string, csrfToken: string): Promise<string> {
    const normalizedCookie = this.extractCookie(cookie)

    const attemptTicket = async (token: string) => {
      return safeRequest<any>({
        method: 'POST',
        url: 'https://auth.roblox.com/v1/authentication-ticket',
        cookie: normalizedCookie,
        skipHba: true,
        headers: {
          Origin: 'https://www.roblox.com',
          Referer: 'https://www.roblox.com/',
          'X-CSRF-TOKEN': token
        },
        returnHeaders: true
      })
    }

    try {
      const result = await attemptTicket(csrfToken)
      const ticket = result.headers['rbx-authentication-ticket']
      if (!ticket) {
        throw new Error('Failed to get authentication ticket')
      }
      return Array.isArray(ticket) ? ticket[0] : ticket
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 403 && error.headers) {
        const newToken = error.headers['x-csrf-token']
        if (newToken) {
          const updatedToken = Array.isArray(newToken) ? newToken[0] : (newToken as string)

          const result = await attemptTicket(updatedToken)
          const ticket = result.headers['rbx-authentication-ticket']
          if (!ticket) {
            throw new Error('Failed to get authentication ticket')
          }
          return Array.isArray(ticket) ? ticket[0] : ticket
        }
      }
      throw error
    }
  }

  static async generateQuickLoginCode() {
    this.log('Generating quick login code')

    try {
      const result = await request(quickLoginCodeSchema, {
        method: 'POST',
        url: 'https://apis.roblox.com/auth-token-service/v1/login/create',
        body: {}
      })

      this.log('Generated quick login code', {
        status: result.status,
        expirationTime: result.expirationTime,
        ...this.quickLoginAttemptDetails(result.code, result.privateKey)
      })

      return result
    } catch (error) {
      this.logError('Failed to generate quick login code', error)
      throw error
    }
  }

  static async checkQuickLoginStatus(code: string, privateKey: string) {
    const url = 'https://apis.roblox.com/auth-token-service/v1/login/status'
    const body = { code, privateKey }

    const attemptStatus = async (csrfToken?: string) => {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken
      }

      return request(quickLoginStatusSchema, {
        method: 'POST',
        url,
        headers,
        body
      })
    }

    this.log('Checking quick login status', this.quickLoginAttemptDetails(code, privateKey))

    try {
      const result = await attemptStatus()
      this.log('Quick login status response received', {
        status: result.status
      })
      return result
    } catch (error) {
      if (error instanceof RequestError) {
        if (
          error.statusCode === 400 &&
          error.body &&
          (error.body === '"CodeInvalid"' ||
            error.body === 'CodeInvalid' ||
            (typeof error.body === 'string' && error.body.includes('CodeInvalid')))
        ) {
          this.log(
            'Quick login status returned CodeInvalid',
            this.quickLoginAttemptDetails(code, privateKey)
          )
          return { status: 'CodeInvalid' }
        }

        if (error.statusCode === 403 && error.headers) {
          const token = error.headers['x-csrf-token']
          if (token) {
            const csrfToken = Array.isArray(token) ? token[0] : (token as string)
            this.log('Quick login status requested CSRF retry', {
              ...this.quickLoginAttemptDetails(code, privateKey),
              headerKeys: this.getHeaderKeys(error.headers)
            })
            const result = await attemptStatus(csrfToken)
            this.log('Quick login status response received after CSRF retry', {
              status: result.status
            })
            return result
          }
        }
      }
      this.logError(
        'Quick login status check failed',
        error,
        this.quickLoginAttemptDetails(code, privateKey)
      )
      throw error
    }
  }

  static async completeQuickLogin(code: string, privateKey: string): Promise<string> {
    const url = 'https://auth.roblox.com/v2/login'
    const body = {
      ctype: 'AuthToken',
      cvalue: code,
      password: privateKey
    }

    const attemptLogin = async (csrfToken?: string) => {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken
      }

      return safeRequest<any>({
        method: 'POST',
        url,
        headers,
        body,
        returnHeaders: true
      })
    }

    this.log('Completing quick login exchange', this.quickLoginAttemptDetails(code, privateKey))

    try {
      const result = await attemptLogin()
      const cookie = this.extractSecurityCookie(result.headers)
      this.log('Quick login exchange succeeded without CSRF challenge', {
        ...this.quickLoginAttemptDetails(code, privateKey),
        hasSecurityCookie: Boolean(cookie),
        headerKeys: this.getHeaderKeys(result.headers)
      })
      if (cookie) {
        return cookie
      }
      throw new Error('Login successful but .ROBLOSECURITY cookie missing')
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 403 && error.headers) {
        const token = error.headers['x-csrf-token']
        if (token) {
          const csrfToken = Array.isArray(token) ? token[0] : (token as string)
          this.log('Quick login exchange requested CSRF retry', {
            ...this.quickLoginAttemptDetails(code, privateKey),
            headerKeys: this.getHeaderKeys(error.headers)
          })

          const result: any = await attemptLogin(csrfToken)
          const cookie = this.extractSecurityCookie(result.headers)
          this.log('Quick login exchange completed after CSRF retry', {
            ...this.quickLoginAttemptDetails(code, privateKey),
            hasSecurityCookie: Boolean(cookie),
            headerKeys: this.getHeaderKeys(result.headers)
          })
          if (cookie) {
            return cookie
          }
          throw new Error('Login successful but .ROBLOSECURITY cookie missing')
        }
      }

      this.logError(
        'Quick login exchange failed',
        error,
        this.quickLoginAttemptDetails(code, privateKey)
      )
      throw error
    }
  }
}
