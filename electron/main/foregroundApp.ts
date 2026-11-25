/**
 * Fast, zero-spawn Win32 foreground process name lookup via koffi.
 * Used by Issue #73 (Include / Exclude app filter for clipboard capture).
 */
import { basename } from 'node:path'

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

let getFgWin: (() => number) | null = null
let getWinThreadPid: ((hwnd: number, pidOut: [number]) => number) | null = null
let openProcess: ((access: number, inherit: boolean, pid: number) => number) | null = null
let queryFullName: ((handle: number, flags: number, buf: Buffer, sizeInOut: [number]) => boolean) | null = null
let closeHandle: ((handle: number) => boolean) | null = null

if (process.platform === 'win32') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const koffi = require('koffi')
    const user32 = koffi.load('user32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    getFgWin = user32.func('uintptr_t GetForegroundWindow()')
    getWinThreadPid = user32.func('uint32_t GetWindowThreadProcessId(uintptr_t hWnd, _Out_ uint32_t *lpdwProcessId)')
    openProcess = kernel32.func('uintptr_t OpenProcess(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwProcessId)')
    queryFullName = kernel32.func('bool QueryFullProcessImageNameW(uintptr_t hProcess, uint32_t dwFlags, _Out_ uint16_t *lpExeName, _Inout_ uint32_t *lpdwSize)')
    closeHandle = kernel32.func('bool CloseHandle(uintptr_t hObject)')
  } catch {
    /* non-Windows or koffi unavailable */
  }
}

/** Return the executable basename (e.g. 'KeePass.exe') of the current foreground window, or null. */
export function getForegroundProcessName(): string | null {
  if (!getFgWin || !getWinThreadPid || !openProcess || !queryFullName || !closeHandle) return null
  try {
    const hwnd = getFgWin()
    if (!hwnd) return null
    const pidOut: [number] = [0]
    getWinThreadPid(hwnd, pidOut)
    const pid = pidOut[0]
    if (!pid) return null
    const hProc = openProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
    if (!hProc) return null
    try {
      const maxChars = 512
      const buf = Buffer.alloc(maxChars * 2)
      const size: [number] = [maxChars]
      const ok = queryFullName(hProc, 0, buf, size)
      if (!ok || size[0] <= 0) return null
      const fullPath = buf.toString('utf16le', 0, size[0] * 2)
      return basename(fullPath) || null
    } finally {
      closeHandle(hProc)
    }
  } catch {
    return null
  }
}
