import { safeRequest, RequestError, request } from '@main/lib/request'
import { quickLoginCodeSchema, quickLoginStatusSchema } from '@shared/ipc-schemas/auth'

export class RobloxAuthService {
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
    try {
      await safeRequest({
        method: 'POST',
        url: 'https://auth.roblox.com/v2/login',
        cookie
      })
      return ''
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 403 && error.headers) {
        const token = error.headers['x-csrf-token']
        if (token) {
          return Array.isArray(token) ? token[0] : (token as string)
        }
      }
      throw new Error('Failed to retrieve CSRF token')
    }
  }

  static async getAuthenticationTicket(cookie: string, csrfToken: string): Promise<string> {
    const attemptTicket = async (token: string) => {
      return safeRequest<any>({
        method: 'POST',
        url: 'https://auth.roblox.com/v1/authentication-ticket',
        cookie,
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
      // If CSRF token is invalid, Roblox will return 403 with a new token in headers
      if (error instanceof RequestError && error.statusCode === 403 && error.headers) {
        const newToken = error.headers['x-csrf-token']
        if (newToken) {
          const updatedToken = Array.isArray(newToken) ? newToken[0] : (newToken as string)

          // Retry with the new token
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
    return request(quickLoginCodeSchema, {
      method: 'POST',
      url: 'https://apis.roblox.com/auth-token-service/v1/login/create',
      body: {}
    })
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

    try {
      return await attemptStatus()
    } catch (error) {
      if (error instanceof RequestError) {
        // Handle invalid/expired code - return special status so frontend can regenerate
        if (
          error.statusCode === 400 &&
          error.body &&
          (error.body === '"CodeInvalid"' ||
            error.body === 'CodeInvalid' ||
            (typeof error.body === 'string' && error.body.includes('CodeInvalid')))
        ) {
          return { status: 'CodeInvalid' }
        }

        // Handle CSRF token requirement
        if (error.statusCode === 403 && error.headers) {
          const token = error.headers['x-csrf-token']
          if (token) {
            const csrfToken = Array.isArray(token) ? token[0] : (token as string)
            // Retry with CSRF token
            return await attemptStatus(csrfToken)
          }
        }
      }
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

      // We expect this to fail with 403 normally to get CSRF, or succeed with cookies
      // safeRequest is used because we need to parse headers manually for cookies
      return safeRequest<any>({
        method: 'POST',
        url,
        headers,
        body,
        returnHeaders: true
      })
    }

    try {
      await attemptLogin()
      throw new Error('Expected 403 for CSRF token, but got success (unexpected)')
    } catch (error) {
      if (error instanceof RequestError && error.statusCode === 403 && error.headers) {
        const token = error.headers['x-csrf-token']
        if (token) {
          const csrfToken = Array.isArray(token) ? token[0] : (token as string)

          // Retry with CSRF token
          const result: any = await attemptLogin(csrfToken)

          // Extract cookie from headers
          const setCookie = result.headers['set-cookie']
          if (setCookie) {
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
            const securityCookie = cookies.find((c: string) => c.includes('.ROBLOSECURITY'))
            if (securityCookie) {
              // Extract the value
              const match = securityCookie.match(/\.ROBLOSECURITY=([^;]+)/)
              if (match) {
                return match[1]
              }
            }
          }
          throw new Error('Login successful but .ROBLOSECURITY cookie missing')
        }
      }

      throw error
    }
  }
}
