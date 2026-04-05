import https from 'node:https'
import { safeRequest, RequestError, request } from '@main/lib/request'
import { quickLoginCodeSchema, quickLoginStatusSchema } from '@shared/contracts/auth'

type HttpsPostResponse = {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

const AUTH_TICKET_URL = 'https://auth.roblox.com/v1/authentication-ticket'
const ROBLOX_WEB_ORIGIN = 'https://www.roblox.com'
const AUTH_REQUEST_TIMEOUT_MS = 30000
const AUTH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

  private static getHeaderValue(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | null {
    const value = headers[name.toLowerCase()]
    if (!value) {
      return null
    }

    return Array.isArray(value) ? (value[0] ?? null) : value
  }

  static extractCookie(cookie: string): string {
    let cookieValue = cookie.trim()
    const match = cookieValue.match(/\.ROBLOSECURITY=([^;]+)/)
    if (match) {
      cookieValue = match[1]
    }
    return cookieValue
  }

  private static httpsPost(
    url: string,
    headers: Record<string, string>
  ): Promise<HttpsPostResponse> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url)
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Content-Length': '0',
            'User-Agent': AUTH_USER_AGENT,
            ...headers
          }
        },
        (res) => {
          let body = ''
          res.setEncoding('utf8')
          res.on('data', (chunk) => {
            body += chunk
          })
          res.on('end', () => {
            resolve({ statusCode: res.statusCode ?? 0, headers: res.headers, body })
          })
        }
      )
      req.setTimeout(AUTH_REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error(`Request timed out after ${AUTH_REQUEST_TIMEOUT_MS}ms`))
      })
      req.on('error', reject)
      req.end()
    })
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
      'https://auth.roblox.com/v2/login',
      'https://auth.roblox.com/v1/authentication-ticket'
    ]

    const errorDetails: string[] = []

    for (const url of csrfBootstrapUrls) {
      try {
        const res = await this.httpsPost(url, {
          Cookie: `.ROBLOSECURITY=${normalizedCookie}`
        })

        const token = this.getHeaderValue(res.headers, 'x-csrf-token')
        if (token) {
          return token
        }

        errorDetails.push(`${url}: HTTP ${res.statusCode} (no CSRF header)`)
      } catch (error) {
        errorDetails.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    const detail = errorDetails.join('; ')
    this.logError('Failed to retrieve CSRF token', new Error(detail), { errorDetails })
    throw new Error(`Failed to retrieve CSRF token (${detail})`)
  }

  static async getAuthenticationTicket(cookie: string, csrfToken?: string): Promise<string> {
    const normalizedCookie = this.extractCookie(cookie)

    const baseHeaders = {
      Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      Origin: ROBLOX_WEB_ORIGIN,
      Referer: `${ROBLOX_WEB_ORIGIN}/`
    }

    const resolveCsrfToken = async (): Promise<string> => {
      if (csrfToken) {
        return csrfToken
      }

      const csrfResponse = await this.httpsPost(AUTH_TICKET_URL, baseHeaders)
      const token = this.getHeaderValue(csrfResponse.headers, 'x-csrf-token')

      if (!token) {
        const headerKeys = Object.keys(csrfResponse.headers)
        console.error('[AuthTicket] CSRF bootstrap response missing token', {
          status: csrfResponse.statusCode,
          headerKeys,
          bodyPreview: csrfResponse.body.slice(0, 160)
        })
        throw new Error(
          `Failed to get authentication ticket CSRF token (HTTP ${csrfResponse.statusCode})`
        )
      }

      return token
    }

    const attemptTicket = async (token: string) => {
      return this.httpsPost(AUTH_TICKET_URL, {
        ...baseHeaders,
        'X-CSRF-TOKEN': token
      })
    }

    const initialToken = await resolveCsrfToken()
    const response = await attemptTicket(initialToken)

    // Handle CSRF token refresh on 403
    if (response.statusCode === 403) {
      const newToken = this.getHeaderValue(response.headers, 'x-csrf-token')
      if (newToken) {
        const retryResponse = await attemptTicket(newToken)
        const ticket = this.getHeaderValue(retryResponse.headers, 'rbx-authentication-ticket')
        if (!ticket) {
          const headerKeys = Object.keys(retryResponse.headers)
          console.error('[AuthTicket] Retry response missing ticket header', {
            status: retryResponse.statusCode,
            headerKeys,
            bodyPreview: retryResponse.body.slice(0, 160)
          })
          throw new Error('Failed to get authentication ticket (after CSRF retry)')
        }
        return ticket
      }
    }

    const ticket = this.getHeaderValue(response.headers, 'rbx-authentication-ticket')
    if (!ticket) {
      const headerKeys = Object.keys(response.headers)
      console.error('[AuthTicket] Response missing ticket header', {
        status: response.statusCode,
        headerKeys,
        bodyPreview: response.body.slice(0, 160)
      })
      throw new Error(`Failed to get authentication ticket (HTTP ${response.statusCode})`)
    }
    return ticket
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
