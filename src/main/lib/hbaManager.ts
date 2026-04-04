import { HBAClient } from 'roblox-bat'
import { webcrypto } from 'node:crypto'

class HBAManager {
  private clients: Map<string, HBAClient> = new Map()

  async getClient(cookie: string): Promise<HBAClient> {
    if (this.clients.has(cookie)) {
      return this.clients.get(cookie)!
    }

    const keys = await webcrypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false,
      ['sign']
    )

    const client = new HBAClient({
      keys: keys as any,
      cookie: `.ROBLOSECURITY=${cookie}`
    })

    this.clients.set(cookie, client)
    return client
  }

  async getHeaders(cookie: string, url: string, method: string): Promise<Record<string, string>> {
    const client = await this.getClient(cookie)
    const headers = await client.generateBaseHeaders(url, method, true)
    return headers as Record<string, string>
  }
}

export const hbaManager = new HBAManager()
