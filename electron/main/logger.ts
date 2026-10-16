/**
 * Centralized Application Logger & Deep System Diagnostics for T-Drop.
 * Writes formatted, rotating logs to %APPDATA%/t-drop/logs/t-drop.log
 * and exposes methods for renderer in-app viewing, folder opening,
 * and exhaustive Microsoft Windows & hardware diagnostics.
 */
import { app, shell, screen } from 'electron'
import { join } from 'node:path'
import os from 'node:os'
import { execSync, execFile } from 'node:child_process'
import { existsSync, mkdirSync, appendFileSync, statSync, renameSync, readFileSync, writeFileSync } from 'node:fs'
import { SUPABASE_CONFIG } from '../../shared/license'
import { getDeviceFingerprint, getLicenseState } from './license'

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
   * Helper to query Windows registry string safely without throwing.
   */
  private static queryRegistry(key: string, name: string): string | null {
    if (process.platform !== 'win32') return null
    try {
      const stdout = execSync(`reg query "${key}" /v ${name}`, {
        encoding: 'utf-8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 1500
      })
      const match = stdout.match(new RegExp(`${name}\\s+REG_\\w+\\s+(.+)`, 'i'))
      return match ? match[1].trim() : null
    } catch {
      return null
    }
  }

  /**
   * Deep query of Microsoft Windows version, build, Insider channel, hardware, and license status via PowerShell CIM.
   */
  private static queryWindowsLicense(): Promise<{
    osCaption?: string
    osVersion?: string
    osBuild?: string
    osArch?: string
    machineModel?: string
    manufacturer?: string
    licName?: string
    licDesc?: string
    licStatus?: number
    partialKey?: string
    displayVersion?: string
    releaseId?: string
    currentBuild?: string
    ubr?: number | string
    buildBranch?: string
    buildLabEx?: string
    editionId?: string
    compositionEditionId?: string
    installationType?: string
    productId?: string
    registeredOwner?: string
    insiderRing?: string | null
    insiderBranch?: string | null
    insiderUIBranch?: string | null
    insiderUIRing?: string | null
  }> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve({})
        return
      }

      const script = `
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$lic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey is not null" -ErrorAction SilentlyContinue | Select-Object -First 1
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$regNT = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' -ErrorAction SilentlyContinue
$selfHost = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\WindowsSelfHost\\Applicability' -ErrorAction SilentlyContinue
$selfUI = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\WindowsSelfHost\\UI\\Selection' -ErrorAction SilentlyContinue

[PSCustomObject]@{
  osCaption = $os.Caption
  osVersion = $os.Version
  osBuild = $os.BuildNumber
  osArch = $os.OSArchitecture
  machineModel = $cs.Model
  manufacturer = $cs.Manufacturer
  licName = $lic.Name
  licDesc = $lic.Description
  licStatus = $lic.LicenseStatus
  partialKey = $lic.PartialProductKey
  displayVersion = $regNT.DisplayVersion
  releaseId = $regNT.ReleaseId
  currentBuild = $regNT.CurrentBuild
  ubr = $regNT.UBR
  buildBranch = $regNT.BuildBranch
  buildLabEx = $regNT.BuildLabEx
  editionId = $regNT.EditionID
  compositionEditionId = $regNT.CompositionEditionID
  installationType = $regNT.InstallationType
  productId = $regNT.ProductId
  registeredOwner = $regNT.RegisteredOwner
  insiderRing = $selfHost.Ring
  insiderBranch = $selfHost.BranchName
  insiderUIBranch = $selfUI.UIBranch
  insiderUIRing = $selfUI.UIRing
} | ConvertTo-Json -Compress
`
      const b64 = Buffer.from(script, 'utf16le').toString('base64')
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], { timeout: 5000 }, (err, stdout) => {
        if (err || !stdout) {
          resolve({})
          return
        }
        try {
          const match = stdout.match(/\{[\s\S]*\}/)
          if (match) {
            resolve(JSON.parse(match[0]))
          } else {
            resolve({})
          }
        } catch {
          resolve({})
        }
      })
    })
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

  /**
   * Collects and writes comprehensive, exhaustive system and Windows OS licensing diagnostics.
   */
  public static async logFullSystemDiagnostics(isAutomatic = false): Promise<void> {
    const trigger = isAutomatic ? 'Auto-Startup' : 'Manual-Request'
    this.write('INFO', 'Diag', `==================== THÔNG TIN CHẨN ĐOÁN CHI TIẾT HỆ THỐNG (${trigger}) ====================`)

    try {
      // 1. Windows OS, Version, Build & Licensing Details
      const winLic = await this.queryWindowsLicense()
      const machineGuid = this.queryRegistry('HKLM\\SOFTWARE\\Microsoft\\Cryptography', 'MachineGuid') || 'Unknown'

      // Detect Windows version name (21H2, 22H2, 23H2, 24H2, 25H2, 26H1, 26H2, etc.)
      const rawDisplayVer = winLic.displayVersion || this.queryRegistry('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'DisplayVersion')
      const buildNum = Number(winLic.currentBuild || winLic.osBuild || 0)

      let deducedVersion = rawDisplayVer || ''
      if (!deducedVersion) {
        if (buildNum >= 27000) deducedVersion = 'Canary/Prerelease (25H2/26H1/26H2)'
        else if (buildNum >= 26200) deducedVersion = '25H2 / Dev'
        else if (buildNum >= 26100) deducedVersion = '24H2'
        else if (buildNum >= 22631) deducedVersion = '23H2'
        else if (buildNum >= 22621) deducedVersion = '22H2'
        else if (buildNum >= 22000) deducedVersion = '21H2'
        else if (buildNum >= 19045) deducedVersion = '22H2'
        else if (buildNum >= 19044) deducedVersion = '21H2'
        else deducedVersion = 'Unknown'
      }

      // Branch codenames
      const branchCodenames: Record<string, string> = {
        ge_release: 'Germanium (Windows 11 24H2 / 25H2 / 26H1)',
        ni_release: 'Nickel (Windows 11 22H2 / 23H2)',
        co_release: 'Cobalt (Windows 11 21H2)',
        vb_release: 'Vibranium (Windows 10 2004 - 22H2)',
        fe_release: 'Iron (Windows Server 2022)'
      }
      const branchName = winLic.buildBranch || ''
      const branchNote = branchCodenames[branchName] ? ` [Codename: ${branchCodenames[branchName]}]` : ''

      // Insider channel detection
      let insiderDesc = 'Bản bán lẻ chính thức (Retail / GA - General Availability)'
      const ring = (winLic.insiderRing || winLic.insiderUIRing || '').trim()
      const uiBranch = (winLic.insiderBranch || winLic.insiderUIBranch || '').trim()

      if (ring || uiBranch) {
        insiderDesc = `Windows Insider Program (${ring || 'Active'} Channel - Nhánh: ${uiBranch || branchName || 'N/A'})`
      } else if (branchName.toLowerCase().includes('canary')) {
        insiderDesc = `Windows Insider Canary Channel (Nhánh: ${branchName})`
      } else if (branchName.toLowerCase().includes('prerelease') || branchName.toLowerCase().includes('dev')) {
        insiderDesc = `Windows Insider Dev / Prerelease Channel (Nhánh: ${branchName})`
      } else if (branchName.toLowerCase().includes('beta')) {
        insiderDesc = `Windows Insider Beta Channel (Nhánh: ${branchName})`
      } else if (buildNum >= 26200) {
        insiderDesc = `Windows Insider Preview / Dev Channel (Build ${buildNum}, Nhánh: ${branchName || 'ge_release'})`
      }

      const fullBuildStr = `${winLic.currentBuild || winLic.osBuild || 'N/A'}${winLic.ubr !== undefined && winLic.ubr !== null ? '.' + winLic.ubr : ''}`

      // Microsoft Windows License Status
      const statusMap: Record<number, string> = {
        0: 'Unlicensed (Chưa có bản quyền)',
        1: 'Licensed (Bản quyền chính hãng vĩnh viễn / Đã kích hoạt Genuine)',
        2: 'OOB Grace (Thời gian ân hạn Out-of-Box)',
        3: 'OOT Grace (Thời gian ân hạn Out-of-Tolerance)',
        4: 'Non-Genuine Grace (Bản quyền không chính hãng / Cần kích hoạt lại)',
        5: 'Notification (Chế độ thông báo kích hoạt / Đang dùng thử / Chờ kích hoạt)',
        6: 'Extended Grace (Thời gian ân hạn mở rộng)'
      }
      const licStatusDesc = winLic.licStatus !== undefined ? (statusMap[winLic.licStatus] || `Mã trạng thái: ${winLic.licStatus}`) : 'Không thể xác định'
      const maskedPartialKey = winLic.partialKey ? `***** - ***** - ***** - ***** - ${winLic.partialKey}` : 'Không tìm thấy partial key'

      // Log OS & Version specifics
      this.write('INFO', 'WinOS', `Hệ điều hành: ${winLic.osCaption || 'Microsoft Windows'} (${winLic.osArch || os.arch()})`)
      this.write('INFO', 'WinOS', `Phiên bản: Windows ${deducedVersion} (DisplayVersion: ${rawDisplayVer || 'N/A'}, ReleaseId: ${winLic.releaseId || 'N/A'})`)
      this.write('INFO', 'WinOS', `Số hiệu bản dựng: Build ${fullBuildStr} (Build chính: ${winLic.currentBuild || 'N/A'}, UBR: ${winLic.ubr ?? 'N/A'})`)
      this.write('INFO', 'WinOS', `Nhánh phát triển (Build Branch): ${branchName || 'N/A'}${branchNote}`)
      this.write('INFO', 'WinOS', `Kênh Windows Insider: ${insiderDesc}`)
      if (winLic.buildLabEx) {
        this.write('INFO', 'WinOS', `Build Lab gốc: ${winLic.buildLabEx}`)
      }
      this.write('INFO', 'WinOS', `Bản phân phối (Edition): ${winLic.editionId || 'N/A'} (Composition: ${winLic.compositionEditionId || 'N/A'}, Loại cài đặt: ${winLic.installationType || 'Client'})`)
      this.write('INFO', 'WinOS', `Windows Product ID: ${winLic.productId || 'Unknown'} | Registered Owner: ${winLic.registeredOwner || 'Unknown'}`)
      this.write('INFO', 'WinOS', `Windows MachineGuid: ${machineGuid}`)

      // Log Microsoft License specifics
      this.write('INFO', 'WinLic', `Bản quyền Microsoft: ${winLic.licName || 'N/A'}`)
      this.write('INFO', 'WinLic', `Kênh cấp phép (Channel): ${winLic.licDesc || 'N/A'}`)
      this.write('INFO', 'WinLic', `Trạng thái bản quyền Windows: [${winLic.licStatus ?? 'N/A'}] ${licStatusDesc}`)
      this.write('INFO', 'WinLic', `Mã khóa Windows một phần (Partial Key): ${maskedPartialKey}`)

      // 3. Hardware Specs
      const cpus = os.cpus()
      const cpuModel = cpus[0]?.model ? `${cpus[0].model} (${cpus.length} Luồng)` : `${os.arch()} (${cpus.length} Cores)`
      const totalRamGb = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
      const freeRamGb = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
      const uptimeHours = (os.uptime() / 3600).toFixed(1)

      this.write('INFO', 'Hardware', `Thiết bị: ${winLic.manufacturer || 'OEM'} ${winLic.machineModel || os.hostname()}`)
      this.write('INFO', 'Hardware', `CPU: ${cpuModel}`)
      this.write('INFO', 'Hardware', `Bộ nhớ RAM: Tổng ${totalRamGb} GB (Còn trống: ${freeRamGb} GB) | Uptime: ${uptimeHours} giờ`)

      // 4. Displays & Monitor Resolution
      if (app.isReady()) {
        try {
          const primary = screen.getPrimaryDisplay()
          const all = screen.getAllDisplays()
          this.write('INFO', 'Display', `Màn hình chính: ${primary.bounds.width}x${primary.bounds.height} (Tỉ lệ Scale: ${primary.scaleFactor * 100}%) | Tổng số màn hình: ${all.length}`)
        } catch {}
      }

      // 5. T-Drop Application Runtime
      const mem = process.memoryUsage()
      const rssMb = (mem.rss / 1024 / 1024).toFixed(1)
      const heapUsedMb = (mem.heapUsed / 1024 / 1024).toFixed(1)
      this.write('INFO', 'Runtime', `T-Drop: v${app.getVersion()} | Electron: ${process.versions.electron} | Chrome: ${process.versions.chrome} | Node: ${process.versions.node}`)
      this.write('INFO', 'Runtime', `RAM chiếm dụng (Process RSS): ${rssMb} MB | Heap: ${heapUsedMb} MB | PID: ${process.pid}`)

      // 6. T-Drop License Fingerprint
      try {
        const fp = getDeviceFingerprint()
        const st = getLicenseState()
        const maskedKey = st.key ? `${st.key.substring(0, 10)}*****` : 'Chưa có'
        this.write('INFO', 'TD-License', `T-Drop Machine ID (hwHash): ${fp.hwHash} | HardwareId: ${fp.hardwareId} | PC: ${fp.pcName}`)
        this.write('INFO', 'TD-License', `Gói sử dụng: ${st.role} (Pro: ${st.isPro}) | User: ${st.userName || 'N/A'} | Key: ${maskedKey}`)
        if (st.expiresAt) {
          this.write('INFO', 'TD-License', `Thời hạn bản quyền T-Drop đến: ${st.expiresAt}`)
        }
      } catch (e: any) {
        this.write('WARN', 'TD-License', `Không thể nạp thông tin license app: ${e?.message || String(e)}`)
      }

      // 7. Backend Supabase Connection Test
      const ping = await this.testBackendPing()
      if (ping.ok) {
        this.write('INFO', 'Network', `Kết nối Supabase: TỐT - HTTP ${ping.status} (${ping.latencyMs}ms) tới ${SUPABASE_CONFIG.url}`)
      } else {
        this.write('WARN', 'Network', `Kết nối Supabase: KHÔNG THÀNH CÔNG (${ping.latencyMs}ms) - Lỗi: ${ping.error || `HTTP ${ping.status}`}`)
      }
    } catch (err: any) {
      this.write('ERROR', 'Diag', `Lỗi khi thu thập chẩn đoán: ${err?.stack || String(err)}`)
    }

    this.write('INFO', 'Diag', '==================== KẾT THÚC CHẨN ĐOÁN HỆ THỐNG ====================')
  }
}
