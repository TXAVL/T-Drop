/**
 * Registers .txa file association in Windows HKCU so double-clicking
 * any .txa file automatically opens with T-Drop.
 */
import { app } from 'electron'
import { execFileSync } from 'node:child_process'

export function registerTxaAssociation(): void {
  if (process.platform !== 'win32') return

  try {
    const exePath = app.getPath('exe')
    if (!exePath || exePath.toLowerCase().includes('electron.exe')) {
      // In dev mode, don't overwrite if not packaged, or register dev executable
      return
    }

    const progId = 'TDrop.Backup'
    const ext = '.txa'
    const openCmd = `"${exePath}" "%1"`

    // 1. HKCU\Software\Classes\.txa
    execFileSync(
      'reg',
      ['add', `HKCU\\Software\\Classes\\${ext}`, '/ve', '/d', progId, '/f'],
      { windowsHide: true, stdio: 'ignore' }
    )

    // 2. HKCU\Software\Classes\TDrop.Backup
    execFileSync(
      'reg',
      ['add', `HKCU\\Software\\Classes\\${progId}`, '/ve', '/d', 'T-Drop Encrypted Backup Archive', '/f'],
      { windowsHide: true, stdio: 'ignore' }
    )

    // 3. Icon
    execFileSync(
      'reg',
      ['add', `HKCU\\Software\\Classes\\${progId}\\DefaultIcon`, '/ve', '/d', `"${exePath}",0`, '/f'],
      { windowsHide: true, stdio: 'ignore' }
    )

    // 4. Open command
    execFileSync(
      'reg',
      ['add', `HKCU\\Software\\Classes\\${progId}\\shell\\open\\command`, '/ve', '/d', openCmd, '/f'],
      { windowsHide: true, stdio: 'ignore' }
    )
  } catch (err) {
    // Non-fatal, best-effort user association
    console.warn('[txaAssociation] Could not register .txa file association:', err)
  }
}
