import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import iconIco from '../../../resources/build/icons/win/icon.ico?asset'
import iconIcns from '../../../resources/build/icons/mac/icon.icns?asset'

const DEFAULT_TITLEBAR_COLOR = '#111111'

export function createMainWindow(
    getStorageService: () => { getWindowWidth(): number | undefined; getWindowHeight(): number | undefined; setWindowWidth(w: number): void; setWindowHeight(h: number): void } | null,
    logPerf: (label: string) => void
): BrowserWindow {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        show: false,
        autoHideMenuBar: true,
        icon: process.platform === 'darwin' ? iconIcns : iconIco,
        backgroundColor: DEFAULT_TITLEBAR_COLOR,
        ...(process.platform === 'darwin'
            ? {
                titleBarStyle: 'hidden',
                trafficLightPosition: { x: 16, y: 16 }
            }
            : {
                frame: false,
                titleBarOverlay: false
            }),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    let resizeTimeout: NodeJS.Timeout | null = null
    mainWindow.on('resized', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
            const storage = getStorageService()
            if (storage) {
                const [width, height] = mainWindow.getSize()
                storage.setWindowWidth(width)
                storage.setWindowHeight(height)
            }
        }, 500)
    })

    mainWindow.on('ready-to-show', () => {
        const storage = getStorageService()
        if (storage) {
            const savedWidth = storage.getWindowWidth()
            const savedHeight = storage.getWindowHeight()
            if (savedWidth && savedHeight) {
                mainWindow.setSize(savedWidth, savedHeight, true)
                mainWindow.center()
            }
        }
        mainWindow.show()
        logPerf('ready-to-show')
    })

    mainWindow.webContents.once('dom-ready', () => logPerf('dom-ready'))
    mainWindow.webContents.once('did-finish-load', () => logPerf('did-finish-load'))

    mainWindow.webContents.on('console-message', (_event, ...args: any[]) => {
        if (args.length === 1 && typeof args[0] === 'object') {
            const { level = 0, message = '', lineNumber: line = 0, sourceId = '' } = args[0]
            if (!shouldForwardRendererConsole(sourceId)) return
            console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
        } else {
            const [level = 0, message = '', line = 0, sourceId = ''] = args as any[]
            if (!shouldForwardRendererConsole(sourceId)) return
            console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
        }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return mainWindow
}

const SUPPRESSED_RENDERER_CONSOLE_SOURCES = [
    '/node_modules/.pnpm/roavatar-renderer@',
    '/node_modules/roavatar-renderer/',
    '/node_modules/.pnpm/multithreading@',
    '/node_modules/multithreading/'
]

function shouldForwardRendererConsole(sourceId: string): boolean {
    const normalizedSourceId = sourceId.replace(/\\/g, '/').toLowerCase()
    return !SUPPRESSED_RENDERER_CONSOLE_SOURCES.some((segment) =>
        normalizedSourceId.includes(segment.toLowerCase())
    )
}
