import koffi from 'koffi'

// Load kernel32.dll
let kernel32: any
try {
  kernel32 = koffi.load('kernel32.dll')
} catch (e) {
  console.error('Failed to load kernel32.dll:', e)
}

let CreateMutexW: any
let CloseHandle: any

if (kernel32) {
  // HANDLE CreateMutexW(LPSECURITY_ATTRIBUTES lpMutexAttributes, BOOL bInitialOwner, LPCWSTR lpName);
  // Use __stdcall for Windows API
  CreateMutexW = kernel32.func('__stdcall', 'CreateMutexW', 'void*', ['void*', 'int', 'str16'])

  // BOOL CloseHandle(HANDLE hObject);
  CloseHandle = kernel32.func('__stdcall', 'CloseHandle', 'int', ['void*'])
}

export namespace MultiInstance {
  let g_mutex: any = null

  export function Enable(): void {
    if (!kernel32) return

    if (!g_mutex) {
      try {
        // CreateMutexW(nullptr, FALSE, L"ROBLOX_singletonEvent");
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
    if (!kernel32) return

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
