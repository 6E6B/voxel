import { ipcMain } from 'electron'
import { net } from 'electron'

export function registerNewsHandlers(): void {
  ipcMain.handle('news:get', async () => {
    try {
      const response = await net.fetch('http://localhost:3000/feed')
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching news:', error)
      throw error
    }
  })
}
