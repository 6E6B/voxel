import koffi from 'koffi'

// Multi-instance is a Windows-only feature. Bail out quietly on other platforms.
const isWindows = process.platform === 'win32'

let kernel32: any
if (isWindows) {
  try {
    kernel32 = koffi.load('kernel32.dll')
  } catch (e) {
    console.error('Failed to load kernel32.dll:', e)
  }
}

let CreateMutexW: any
let CloseHandle: any

if (kernel32) {
  CreateMutexW = kernel32.func('__stdcall', 'CreateMutexW', 'void*', ['void*', 'int', 'str16'])
  CloseHandle = kernel32.func('__stdcall', 'CloseHandle', 'int', ['void*'])
}

export namespace MultiInstance {
  let g_mutex: any = null

  export function Enable(): void {
    if (!isWindows || !kernel32) return

    if (!g_mutex) {
      try {
        g_mutex = CreateMutexW(null, 0, 'ROBLOX_singletonEvent')

        if (g_mutex) {
        } else {
          console.error('MultiInstance: Failed to create mutex')
        }
      } catch (e) {
        console.error('MultiInstance: Error creating mutex:', e)
      }
    }
  }

  export function Disable(): void {
    if (!isWindows || !kernel32) return

    if (g_mutex) {
      try {
        CloseHandle(g_mutex)
        g_mutex = null
      } catch (e) {
        console.error('MultiInstance: Error closing mutex:', e)
      }
    }
  }
}
