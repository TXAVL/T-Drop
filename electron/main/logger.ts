/**
 * Centralized Application Logger & Deep System Diagnostics for T-Drop.
 * Writes formatted, rotating logs to %APPDATA%/t-drop/logs/t-drop.log
 * and exposes methods for renderer in-app viewing, folder opening,
 * and exhaustive Microsoft Windows & hardware diagnostics.
 */
import { app, shell } from 'electron'
import { join } from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, appendFileSync, statSync, renameSync, readFileSync, writeFileSync } from 'node:fs'
import { SUPABASE_CONFIG } from '../../shared/license'
import { getDeviceFingerprint, getLicenseState } from './license'
import { getWindowsInfo, getHardwareInfo, getDisplayLines, getInstallInfo, NA, UNKNOWN, ERR } from './sysinfo'

const MAX_LOG_SIZE = 2 * 1024 * 1024 // 2 MB

export class AppLogger {
  private static initialized = false

  public static logDir(): string {
    return join(app.getPath('userData'), 'logs')
  }

  public static logFilePath(): string {
    return join(this.logDir(), 't-drop.log')
  }

  public static oldLogFilePath(): string {
    return join(this.logDir(), 't-drop.old.log')
  }

  private static ensureDir(): void {
    const dir = this.logDir()
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true })
      } catch {}
    }
  }

  public static init(): void {
    if (this.initialized) return
    this.initialized = true

    this.ensureDir()
    this.write('INFO', 'System', `=== T-Drop Started (v${app.getVersion()}) on ${process.platform} ${process.arch} ===`)

    // Intercept unhandled errors
    process.on('uncaughtException', (err) => {
      this.write('ERROR', 'UncaughtException', err?.stack || String(err))
    })

    process.on('unhandledRejection', (reason) => {
      this.write('ERROR', 'UnhandledRejection', reason instanceof Error ? reason.stack || reason.message : String(reason))
    })

    // Run deep diagnostics in the background after startup without delaying UI
    setTimeout(() => {
      void this.logFullSystemDiagnostics(true)
    }, 2000)
  }

  public static write(level: 'INFO' | 'WARN' | 'ERROR', tag: string, message: string, meta?: any): void {
    try {
      this.ensureDir()
      const file = this.logFilePath()

      // Rotate if > 2MB
      if (existsSync(file)) {
        try {
          const size = statSync(file).size
          if (size > MAX_LOG_SIZE) {
            try {
              renameSync(file, this.oldLogFilePath())
            } catch {}
          }
        } catch {}
      }

      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
      const metaStr = meta !== undefined ? ` | ${typeof meta === 'object' ? JSON.stringify(meta) : String(meta)}` : ''
      const line = `[${timestamp}] [${level.padEnd(5)}] [${tag}] ${message}${metaStr}\n`

      appendFileSync(file, line, 'utf-8')
    } catch {}
  }

  public static getRecentLogs(maxLines = 300): string {
    try {
      const file = this.logFilePath()
      if (!existsSync(file)) return 'Chưa có nhật ký hoạt động nào.'
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      return lines.slice(-maxLines).join('\n')
    } catch (e: any) {
      return `Không thể đọc log: ${e?.message || String(e)}`
    }
  }

  public static clearLogs(): boolean {
    try {
      const file = this.logFilePath()
      if (existsSync(file)) writeFileSync(file, '', 'utf-8')
      const old = this.oldLogFilePath()
      if (existsSync(old)) writeFileSync(old, '', 'utf-8')
      this.write('INFO', 'System', 'Logs cleared by user')
      return true
    } catch {
      return false
    }
  }

  public static openFolder(): boolean {
    try {
      this.ensureDir()
      void shell.openPath(this.logDir())
      return true
    } catch {
      return false
    }
  }

  /**
   * Measure network reachability and HTTP latency to the Supabase backend.
   */
  private static async testBackendPing(): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
    const t0 = Date.now()
    try {
      const res = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/health`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_CONFIG.publishableKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.publishableKey}`
        }
      })
      return {
        ok: res.ok,
        status: res.status,
        latencyMs: Date.now() - t0
      }
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        latencyMs: Date.now() - t0,
        error: err?.message || String(err)
      }
    }
  }

  /** Windows product activation status (slow CIM query, kept isolated with its own timeout). */
  private static queryWindowsActivation(): Promise<{ name?: string; desc?: string; status?: number; partialKey?: string } | null> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') return resolve(null)
      const script = `$ErrorActionPreference='SilentlyContinue';$l=Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey is not null AND Name like 'Windows%'"|select -First 1;@{name=$l.Name;desc=$l.Description;status=$l.LicenseStatus;partialKey=$l.PartialProductKey}|ConvertTo-Json -Compress`
      const b64 = Buffer.from(script, 'utf16le').toString('base64')
      const ps = `${process.env.SystemRoot || 'C:/Windows'}/System32/WindowsPowerShell/v1.0/powershell.exe`
      execFile(ps, ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], { timeout: 8000, windowsHide: true }, (err, stdout) => {
        if (err || !stdout) return resolve(null)
        try {
          const m = stdout.match(/\{[\s\S]*\}/)
          resolve(m ? JSON.parse(m[0]) : null)
        } catch {
          resolve(null)
        }
      })
    })
  }

  private static writeSection(tag: string, lines: string[], failed = false): void {
    for (const l of lines) this.write(failed || /(^|\s)ERROR\b/.test(l) ? 'WARN' : 'INFO', tag, l)
  }

  /**
   * Collects and writes system, Windows, hardware and installation diagnostics.
   * Each section is independent: one failing query never breaks the others.
   */
  public static async logFullSystemDiagnostics(isAutomatic = false): Promise<void> {
    const trigger = isAutomatic ? 'Auto-Startup' : 'Manual-Request'
    this.write('INFO', 'Diag', `==================== THÔNG TIN CHẨN ĐOÁN CHI TIẾT HỆ THỐNG (${trigger}) ====================`)

    const section = async (name: string, fn: () => Promise<void> | void) => {
      try {
        await fn()
      } catch (e: any) {
        this.write('ERROR', name, `Section failed: ${e?.message || String(e)}`)
      }
    }

    // Kick off the slow queries together (each has its own timeout).
    const winP = getWindowsInfo()
    const hwP = getHardwareInfo()
    const instP = getInstallInfo()
    const actP = this.queryWindowsActivation()

    await section('WinOS', async () => {
      const w = await winP
      this.write('INFO', 'WinOS', `Product Name: ${w.productName}`)
      this.write('INFO', 'WinOS', `Edition: ${w.edition} (Composition: ${w.composition})`)
      this.write('INFO', 'WinOS', `Display Version: ${w.displayVersion} | Release ID: ${w.releaseId}`)
      this.write('INFO', 'WinOS', `Build: ${w.build}`)
      this.write('INFO', 'WinOS', `UBR: ${w.ubr}`)
      this.write('INFO', 'WinOS', `Full Build: ${w.build}${w.ubr !== NA ? '.' + w.ubr : ''}`)
      this.write('INFO', 'WinOS', `BuildLabEx: ${w.buildLabEx}`)
      this.write('INFO', 'WinOS', `Build Branch: ${w.buildBranch}`)
      this.write('INFO', 'WinOS', `Installation Type: ${w.installationType} | Architecture: ${w.architecture}`)
      this.write('INFO', 'WinOS', `Product ID: ${w.productId} | Registered Owner: ${w.registeredOwner}`)
      this.write(w.insider.channel === UNKNOWN ? 'WARN' : 'INFO', 'WinInsider', `Channel: ${w.insider.channel}`)
      this.write('INFO', 'WinInsider', `Evidence: ${w.insider.evidence}`)
    })

    await section('WinLic', async () => {
      const act = await actP
      if (!act) {
        this.write('WARN', 'WinLic', `Windows activation: ${ERR} (query failed or timed out)`)
        return
      }
      const statusMap: Record<number, string> = { 0: 'Unlicensed', 1: 'Licensed', 2: 'OOB Grace', 3: 'OOT Grace', 4: 'Non-Genuine Grace', 5: 'Notification', 6: 'Extended Grace' }
      this.write('INFO', 'WinLic', `Product: ${act.name || NA} | Channel: ${act.desc || NA}`)
      this.write('INFO', 'WinLic', `Status: [${act.status ?? NA}] ${act.status !== undefined ? statusMap[act.status] || UNKNOWN : UNKNOWN}`)
      this.write('INFO', 'WinLic', `Partial Key: ${act.partialKey ? `*****-${act.partialKey}` : NA}`)
    })

    await section('Hardware', async () => {
      const hw = await hwP
      this.write('INFO', 'Hardware', `Uptime: ${(os.uptime() / 3600).toFixed(1)} h | Hostname: ${os.hostname()}`)
      this.writeSection('CPU', hw.cpu.lines, !hw.cpu.ok)
      this.writeSection('Memory', hw.memory.lines)
      this.writeSection('GPU', hw.gpu.lines, !hw.gpu.ok)
      this.writeSection('Motherboard', hw.board.lines, !hw.board.ok)
      this.writeSection('BIOS', hw.bios.lines, !hw.bios.ok)
      this.writeSection('Storage', hw.storage.lines, !hw.storage.ok)
    })

    await section('Display', () => this.writeSection('Display', getDisplayLines()))

    await section('Install', async () => {
      const i = await instP
      this.write('INFO', 'Install', `Type: ${i.type}`)
      this.write('INFO', 'Install', `Source: ${i.source}`)
      this.write('INFO', 'Install', `Package Family Name: ${i.familyName} | Package Full Name: ${i.fullName}`)
      this.write('INFO', 'Install', `Package Version: ${i.version}`)
      this.write('INFO', 'Install', `Install Location: ${i.installLocation}`)
      this.write('INFO', 'Install', `Executable: ${i.exePath}`)
      this.write('INFO', 'Install', `Executable Directory: ${i.exeDir}`)
      this.write('INFO', 'Install', `Is Packaged: ${i.isPackaged} | Is Portable: ${i.isPortable} | Is Store Installed: ${i.isStoreInstalled}`)
    })

    await section('Runtime', () => {
      const mem = process.memoryUsage()
      this.write('INFO', 'Runtime', `T-Drop: v${app.getVersion()} | Electron: ${process.versions.electron} | Chrome: ${process.versions.chrome} | Node: ${process.versions.node}`)
      this.write('INFO', 'Runtime', `RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB | PID: ${process.pid}`)
    })

    await section('TD-License', () => {
      const fp = getDeviceFingerprint()
      const st = getLicenseState()
      const maskedKey = st.key ? `${st.key.substring(0, 10)}*****` : 'Chưa có'
      // hwHash = sha256(hardwareId + ":" + pcName)[0..6], frozen after first read so renaming the PC keeps it.
      // hardwareId = sha256("TDROP_HW:" + MachineGuid)[0..16].
      this.write('INFO', 'TD-License', `T-Drop Machine ID (hwHash): ${fp.hwHash} | HardwareId: ${fp.hardwareId} | PC: ${fp.pcName} | Reliable: ${fp.reliable !== false}`)
      this.write('INFO', 'TD-License', `Gói sử dụng: ${st.role} (Pro: ${st.isPro}) | User: ${st.userName || 'N/A'} | Key: ${maskedKey}`)
      if (st.expiresAt) this.write('INFO', 'TD-License', `Thời hạn bản quyền T-Drop đến: ${st.expiresAt}`)
    })

    await section('Network', async () => {
      const ping = await this.testBackendPing()
      if (ping.ok) {
        this.write('INFO', 'Network', `Kết nối Supabase: TỐT - HTTP ${ping.status} (${ping.latencyMs}ms) tới ${SUPABASE_CONFIG.url}`)
      } else {
        this.write('WARN', 'Network', `Kết nối Supabase: KHÔNG THÀNH CÔNG (${ping.latencyMs}ms) - Lỗi: ${ping.error || `HTTP ${ping.status}`}`)
      }
    })

    this.write('INFO', 'Diag', '==================== KẾT THÚC CHẨN ĐOÁN HỆ THỐNG ====================')
  }
}
