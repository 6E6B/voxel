import { net } from 'electron'
import { z } from 'zod'
import { hbaManager } from './hbaManager'

interface RequestOptions {
  method?: string
  url: string
  cookie?: string
  body?: any
  headers?: Record<string, string>
  returnHeaders?: boolean
}

export class RequestError extends Error {
  statusCode?: number
  headers?: Record<string, string | string[]>
  body?: string

  constructor(
    message: string,
    statusCode?: number,
    headers?: Record<string, string | string[]>,
    body?: string
  ) {
    super(message)
    this.name = 'RequestError'
    this.statusCode = statusCode
    this.headers = headers
    this.body = body
  }
}

export const safeRequest = <T>(options: RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET'

    const request = net.request({
      method,
      url: options.url
    })

    const timeout = setTimeout(() => {
      request.abort()
      reject(new RequestError('Request timed out', 408))
    }, 30000)

    request.on('redirect', () => {
      request.followRedirect()
    })

    request.on('response', (response) => {
      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })

      response.on('end', () => {
        clearTimeout(timeout)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            const result = data ? JSON.parse(data) : {}

            if (options.returnHeaders) {
              resolve({ data: result, headers: response.headers } as unknown as T)
            } else {
              resolve(result)
            }
          } catch {
            reject(
              new RequestError(`Failed to parse response from ${options.url}`, response.statusCode)
            )
          }
        } else {
          reject(
            new RequestError(
              `Request failed with status code ${response.statusCode}`,
              response.statusCode,
              response.headers,
              data || undefined
            )
          )
        }
      })
    })

    request.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    const send = async () => {
      if (options.cookie) {
        request.setHeader('Cookie', `.ROBLOSECURITY=${options.cookie}`)
        try {
          const hbaHeaders = await hbaManager.getHeaders(options.cookie, options.url, method)
          Object.entries(hbaHeaders).forEach(([key, value]) => {
            request.setHeader(key, value)
          })
        } catch (error) {
          console.error('Failed to generate HBA headers:', error)
        }
      }

      request.setHeader('Content-Type', 'application/json')
      request.setHeader(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          request.setHeader(key, value)
        })
      }

      if (options.body) {
        request.write(JSON.stringify(options.body))
      }

      request.end()
    }

    void send().catch((error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

export const safeFetchText = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url
    })

    request.on('response', (response) => {
      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data)
        } else {
          reject(
            new RequestError(
              `Request failed with status code ${response.statusCode}`,
              response.statusCode,
              response.headers,
              data
            )
          )
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}

export const safeFetchBuffer = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url
    })

    request.on('response', (response) => {
      const chunks: Buffer[] = []

      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      response.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(buffer)
        } else {
          reject(
            new RequestError(
              `Request failed with status code ${response.statusCode}`,
              response.statusCode,
              response.headers,
              buffer.toString('utf-8')
            )
          )
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}

export const request = async <T>(schema: z.ZodType<T>, options: RequestOptions): Promise<T> => {
  const data = await safeRequest<unknown>(options)
  return schema.parse(data)
}

export const requestWithCsrf = async <T>(
  schema: z.ZodType<T>,
  options: RequestOptions
): Promise<T> => {
  try {
    const data = await safeRequest<unknown>(options)
    return schema.parse(data)
  } catch (error) {
    if (error instanceof RequestError && error.statusCode === 403 && error.headers) {
      const token = error.headers['x-csrf-token']
      if (token) {
        const csrfToken = Array.isArray(token) ? token[0] : (token as string)
        const data = await safeRequest<unknown>({
          ...options,
          headers: {
            ...options.headers,
            'x-csrf-token': csrfToken
          }
        })
        return schema.parse(data)
      }
    }
    throw error
  }
}
