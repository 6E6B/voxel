import path from 'path'
import fs from 'fs'
import { net } from 'electron'

/**
 * Helper function to compute CDN server from hash
 */
export const hashToServer = (hash: string): number => {
  let i = 31
  for (const c of hash) {
    i ^= c.charCodeAt(0)
  }
  return i % 8
}

/**
 * Helper function to download a file from URL
 */
export const downloadFileToPath = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const request = net.request(url)
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      const file = fs.createWriteStream(dest)
      file.on('error', (err) => {
        file.close()
        fs.unlink(dest, () => {})
        reject(err)
      })
      file.on('finish', () => {
        file.close(() => resolve())
      })

      response.on('data', (chunk) => file.write(chunk))
      response.on('end', () => file.end())
      response.on('error', (err) => {
        file.close()
        fs.unlink(dest, () => {})
        reject(err)
      })
    })
    request.on('error', reject)
    request.end()
  })
}
