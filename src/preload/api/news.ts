import { ipcRenderer } from 'electron'

export const newsApi = {
  news: {
    getTweets: (): Promise<any> => ipcRenderer.invoke('news:get')
  }
}
