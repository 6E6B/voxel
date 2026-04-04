import { ipcRenderer } from 'electron'
import type { UpdateState } from '@shared/contracts/updater'

export interface IpcApi {
    onUpdaterStatus: (callback: (state: UpdateState) => void) => () => void
    captureScreen: () => Promise<string | null>
}

export const ipcApi: IpcApi = {
    onUpdaterStatus: (callback: (state: UpdateState) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => {
            callback(state)
        }
        ipcRenderer.on('updater:status', handler)
        return () => {
            ipcRenderer.removeListener('updater:status', handler)
        }
    },
    captureScreen: () => ipcRenderer.invoke('eyedropper:capture-screen')
}
