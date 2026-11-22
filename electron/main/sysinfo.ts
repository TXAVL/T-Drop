/**
 * Hardware / Windows / installation detection for diagnostics.
 *
 * Rules:
 *  - every section is independent, has its own timeout and never throws;
 *  - values are never invented: a missing value is 'N/A' (does not exist),
 *    'UNKNOWN' (cannot be proven) or 'ERROR' (the query failed);
 *  - registry is read through reg.exe (no PowerShell needed, no admin needed);
 *  - PowerShell/CIM is only used for hardware inventory, with a timeout.
 */
import os from 'node:os'
import { app, screen } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { refreshTxapmStatus } from './txaUpdater'

export const NA = 'N/A'
export const UNKNOWN = 'UNKNOWN'
export const ERR = 'ERROR'

const SYS32 = `${process.env.SystemRoot || 'C:/Windows'}/System32`

function run(file: string, args: string[], timeout: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(file, args, { timeout, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
        resolve(err || !stdout ? null : stdout)
      })
    } catch {
      resolve(null)
    }
  })
}

/** All values of one registry key, e.g. { ProductName: 'Windows 11 Pro', UBR: '1' }. null = key unreadable. */
export async function regValues(key: string): Promise<Record<string, string> | null> {
  if (process.platform !== 'win32') return null
  const out = await run(`${SYS32}/reg.exe`, ['query', key], 4000)
  if (!out) return null
  const res: Record<string, string> = {}
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^\s{4}(.+?)\s{4}(REG_\w+)\s{4}(.*)$/)
    if (!m) continue
    let v = m[3].trim()
    if (m[2] === 'REG_DWORD' || m[2] === 'REG_QWORD') {
      const n = Number.parseInt(v, 16)
      if (!Number.isNaN(n)) v = String(n)
    }
    res[m[1]] = v
  }
  return res
}

async function psJson<T>(script: string, timeout: number): Promise<T | null> {
  const full = `$ErrorActionPreference='SilentlyContinue';[Console]::OutputEncoding=[Text.Encoding]::UTF8;${script}`
  const b64 = Buffer.from(full, 'utf16le').toString('base64')
  const out = await run(`${SYS32}/WindowsPowerShell/v1.0/powershell.exe`, ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], timeout)
  if (!out) return null
  const m = out.match(/[\[{][\s\S]*[\]}]/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as T
  } catch {
    return null
  }
}

const val = (v: unknown): string => {
  if (v === undefined || v === null) return NA
  const s = String(v).trim()
  return s ? s : NA
}
const first = (...vs: unknown[]): string => {
  for (const v of vs) if (val(v) !== NA) return val(v)
  return NA
}
const gb = (bytes: number): string => (bytes / 1024 ** 3).toFixed(2)

/* ----------------------------- Windows OS ----------------------------- */

export interface WinOsInfo {
  productName: string
  edition: string
  displayVersion: string
  releaseId: string
  build: string
  ubr: string
  buildLabEx: string
  buildBranch: string
  installationType: string
  architecture: string
  productId: string
  registeredOwner: string
  composition: string
  insider: { channel: string; evidence: string }
}

/** Pure: decide the Insider channel from evidence. Never defaults to Retail without proof. */
export function detectInsiderChannel(
  nt: Record<string, string> | null,
  applicability: Record<string, string> | null,
  uiSelection: Record<string, string> | null
): { channel: string; evidence: string } {
  if (!nt) return { channel: UNKNOWN, evidence: 'registry CurrentVersion unreadable' }
  const branchName = (applicability?.BranchName || '').toLowerCase()
  const uiBranch = (uiSelection?.UIBranch || '').toLowerCase()
  const ring = (applicability?.Ring || uiSelection?.UIRing || '').toLowerCase()
  const content = (applicability?.ContentType || uiSelection?.UIContentType || '').toLowerCase()
  const probe = `${branchName} ${uiBranch}`

  const tag = (ch: string, ev: string) => ({ channel: ch, evidence: ev })
  const evidence = `BranchName=${applicability?.BranchName || NA}, UIBranch=${uiSelection?.UIBranch || NA}, Ring=${applicability?.Ring || uiSelection?.UIRing || NA}, ContentType=${applicability?.ContentType || NA}`

  if (probe.includes('canary')) return tag('Canary', evidence)
  if (probe.includes('releasepreview') || probe.includes('release preview') || ring === 'rp') return tag('Release Preview', evidence)
  if (probe.includes('beta')) return tag('Beta', evidence)
  if (/(^|\W)dev(\W|$)/.test(probe) || probe.includes('dev channel')) return tag('Dev', evidence)

  // Enrolled in Insider but the channel name is not recognised.
  if (applicability && (branchName || ring || content) && ring !== 'retail' && content !== 'mainline') {
    return tag(UNKNOWN, `Insider enrollment present but channel not recognised (${evidence})`)
  }

  const branch = (nt.BuildBranch || '').toLowerCase()
  const lab = (nt.BuildLabEx || '').toLowerCase()
  if (branch.includes('prerelease') || lab.includes('prerelease')) {
    return tag(UNKNOWN, `Prerelease build (${nt.BuildBranch || nt.BuildLabEx}) without channel evidence`)
  }
  if (branch.endsWith('_release') || (!applicability && !uiSelection && branch)) {
    return tag('Retail / GA', `No Insider enrollment keys; BuildBranch=${nt.BuildBranch || NA}`)
  }
  return tag(UNKNOWN, 'insufficient evidence')
}

export async function getWindowsInfo(): Promise<WinOsInfo> {
  const [nt, app1, ui] = await Promise.all([
    regValues('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion'),
    regValues('HKLM\\SOFTWARE\\Microsoft\\WindowsSelfHost\\Applicability'),
    regValues('HKLM\\SOFTWARE\\Microsoft\\WindowsSelfHost\\UI\\Selection')
  ])
  const n = nt || {}
  // Fallbacks that come from real OS APIs, not hardcoded values.
  const osBuild = os.release().split('.')[2]
  const build = first(n.CurrentBuild, n.CurrentBuildNumber, osBuild)
  const buildNum = Number(build)
  let productName = val(n.ProductName)
  // Registry ProductName still says "Windows 10" on Windows 11 builds; trust the build number.
  if (productName.startsWith('Windows 10') && buildNum >= 22000) productName = productName.replace('Windows 10', 'Windows 11')
  if (productName === NA && nt === null) productName = first(os.version())
  return {
    productName,
    edition: val(n.EditionID),
    displayVersion: first(n.DisplayVersion, n.ReleaseId),
    releaseId: val(n.ReleaseId),
    build,
    ubr: val(n.UBR),
    buildLabEx: val(n.BuildLabEx),
    buildBranch: val(n.BuildBranch),
    installationType: val(n.InstallationType),
    architecture: os.arch() === 'x64' ? 'x64' : os.arch(),
    productId: val(n.ProductId),
    registeredOwner: val(n.RegisteredOwner),
    composition: val(n.CompositionEditionID),
    insider: detectInsiderChannel(nt, app1, ui)
  }
}

/* ----------------------------- Hardware ----------------------------- */

interface HwRaw {
  cpu?: { Name?: string; Manufacturer?: string; Cores?: number; Logical?: number; MaxMHz?: number; Arch?: number }[]
  board?: { Manufacturer?: string; Product?: string }
  bios?: { Manufacturer?: string; Version?: string; Date?: string }
}
interface GpuRaw {
  Name?: string
  Vendor?: string
  Driver?: string
  Date?: string
  VramBytes?: number | null
}
interface DiskRaw {
  disks?: { Model?: string; Media?: string; Bus?: string; Size?: number }[]
  vols?: { Id?: string; Fs?: string; Size?: number; Free?: number }[]
}

const ARCH: Record<number, string> = { 0: 'x86', 5: 'ARM', 9: 'x64', 12: 'ARM64' }

export interface HardwareInfo {
  cpu: { ok: boolean; lines: string[] }
  memory: { ok: boolean; lines: string[] }
  gpu: { ok: boolean; lines: string[] }
  board: { ok: boolean; lines: string[] }
  bios: { ok: boolean; lines: string[] }
  storage: { ok: boolean; lines: string[] }
}

export async function getHardwareInfo(): Promise<HardwareInfo> {
  const [hw, gpus, disk] = await Promise.all([
    psJson<HwRaw>(
      `$c=@(Get-CimInstance Win32_Processor|%{@{Name=$_.Name;Manufacturer=$_.Manufacturer;Cores=$_.NumberOfCores;Logical=$_.NumberOfLogicalProcessors;MaxMHz=$_.MaxClockSpeed;Arch=$_.Architecture}});
$b=Get-CimInstance Win32_BaseBoard;$s=Get-CimInstance Win32_BIOS;
@{cpu=$c;board=@{Manufacturer=$b.Manufacturer;Product=$b.Product};bios=@{Manufacturer=$s.Manufacturer;Version=$s.SMBIOSBIOSVersion;Date=$(if($s.ReleaseDate){$s.ReleaseDate.ToString('yyyy-MM-dd')})}}|ConvertTo-Json -Compress -Depth 5`,
      8000
    ),
    psJson<GpuRaw[] | GpuRaw>(
      `$cls='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11cd-bfc1-08002be10318}';
$keys=@(Get-ChildItem $cls|%{Get-ItemProperty $_.PSPath});
$g=@(Get-CimInstance Win32_VideoController|%{$n=$_.Name;
$k=$keys|?{$_.DriverDesc -eq $n}|select -First 1;
$v=$null;if($k -and $k.'HardwareInformation.qwMemorySize'){$v=[double]$k.'HardwareInformation.qwMemorySize'}
@{Name=$n;Vendor=$_.AdapterCompatibility;Driver=$_.DriverVersion;Date=$(if($_.DriverDate){$_.DriverDate.ToString('yyyy-MM-dd')});VramBytes=$v}});
ConvertTo-Json -InputObject $g -Compress -Depth 4`,
      8000
    ),
    psJson<DiskRaw>(
      `$d=@(Get-PhysicalDisk|%{@{Model=$_.FriendlyName;Media=[string]$_.MediaType;Bus=[string]$_.BusType;Size=$_.Size}});
if($d.Count -eq 0){$d=@(Get-CimInstance Win32_DiskDrive|%{@{Model=$_.Model;Media='';Bus=$_.InterfaceType;Size=$_.Size}})}
$v=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'|%{@{Id=$_.DeviceID;Fs=$_.FileSystem;Size=$_.Size;Free=$_.FreeSpace}});
@{disks=$d;vols=$v}|ConvertTo-Json -Compress -Depth 5`,
      10000
    )
  ])

  // CPU
  const cpu: HardwareInfo['cpu'] = { ok: false, lines: [] }
  const logicalNode = os.cpus().length
  const c = hw?.cpu?.[0]
  if (c) {
    cpu.ok = true
    const sockets = hw!.cpu!.length
    const cores = hw!.cpu!.reduce((a, x) => a + (x.Cores || 0), 0)
    const logical = hw!.cpu!.reduce((a, x) => a + (x.Logical || 0), 0)
    cpu.lines = [
      `Name: ${val(c.Name)}`,
      `Manufacturer: ${val(c.Manufacturer)}`,
      `Architecture: ${c.Arch !== undefined ? ARCH[c.Arch] || UNKNOWN : os.arch()}`,
      `Physical Cores: ${cores > 0 ? cores : NA}${sockets > 1 ? ` (${sockets} sockets)` : ''}`,
      `Logical Processors: ${logical > 0 ? logical : logicalNode}`,
      `Base Clock: ${NA}`,
      `Maximum Clock: ${c.MaxMHz ? `${c.MaxMHz} MHz` : NA}`
    ]
  } else {
    cpu.lines = [
      `Name: ${val(os.cpus()[0]?.model)} (fallback: Node os.cpus)`,
      `Architecture: ${os.arch()}`,
      `Physical Cores: ${NA}`,
      `Logical Processors: ${logicalNode}`,
      `Query: ${ERR} (CIM Win32_Processor unavailable)`
    ]
  }

  // Memory (physical only; os.totalmem/freemem never include page file)
  const total = os.totalmem()
  const avail = os.freemem()
  const used = total - avail
  const memory = {
    ok: true,
    lines: [
      `Total: ${gb(total)} GB`,
      `Available: ${gb(avail)} GB`,
      `Used: ${gb(used)} GB`,
      `Usage: ${total > 0 ? ((used / total) * 100).toFixed(1) : NA}%`
    ]
  }

  // GPU
  const gpu: HardwareInfo['gpu'] = { ok: false, lines: [] }
  const gpuList = gpus ? (Array.isArray(gpus) ? gpus : [gpus]).filter((g) => g && g.Name) : []
  if (gpuList.length) {
    gpu.ok = true
    gpu.lines.push(`Count: ${gpuList.length}`)
    gpuList.forEach((g, i) => {
      const p = gpuList.length > 1 ? `#${i + 1} ` : ''
      gpu.lines.push(`${p}Name: ${val(g.Name)}`)
      gpu.lines.push(`${p}Manufacturer: ${val(g.Vendor)}`)
      gpu.lines.push(`${p}Driver Version: ${val(g.Driver)}`)
      gpu.lines.push(`${p}Driver Date: ${val(g.Date)}`)
      // Only the dedicated-memory registry value is used; AdapterRAM overflows at 4 GB and shared memory is excluded.
      gpu.lines.push(`${p}VRAM (dedicated): ${g.VramBytes ? `${(g.VramBytes / 1024 ** 3).toFixed(2)} GB` : `${NA} (not exposed by driver)`}`)
    })
  } else {
    gpu.lines.push(`Query: ${ERR} (CIM Win32_VideoController unavailable)`)
  }

  // Board / BIOS
  const board = {
    ok: !!hw?.board,
    lines: hw?.board
      ? [`Manufacturer: ${val(hw.board.Manufacturer)}`, `Product: ${val(hw.board.Product)}`]
      : [`Query: ${ERR} (CIM Win32_BaseBoard unavailable)`]
  }
  const bios = {
    ok: !!hw?.bios,
    lines: hw?.bios
      ? [`Manufacturer: ${val(hw.bios.Manufacturer)}`, `Version: ${val(hw.bios.Version)}`, `Release Date: ${val(hw.bios.Date)}`]
      : [`Query: ${ERR} (CIM Win32_BIOS unavailable)`]
  }

  // Storage
  const storage: HardwareInfo['storage'] = { ok: false, lines: [] }
  if (disk && (disk.disks || disk.vols)) {
    storage.ok = true
    const sysDrive = (process.env.SystemDrive || 'C:').toUpperCase()
    const disks = ([] as NonNullable<DiskRaw['disks']>).concat(disk.disks || [])
    const vols = ([] as NonNullable<DiskRaw['vols']>).concat(disk.vols || [])
    storage.lines.push(`System Drive: ${sysDrive}`)
    disks.forEach((d, i) => {
      // Bus/media come straight from the OS; NVMe is only reported when BusType says so.
      const bus = (d.Bus || '').toLowerCase()
      const media = (d.Media || '').toLowerCase()
      let type = UNKNOWN
      if (bus === 'nvme') type = 'NVMe'
      else if (media === 'ssd') type = 'SSD'
      else if (media === 'hdd') type = 'HDD'
      storage.lines.push(`Disk ${i + 1}: ${val(d.Model)} | Type: ${type} | Bus: ${val(d.Bus)} | Capacity: ${d.Size ? gb(d.Size) + ' GB' : NA}`)
    })
    vols.forEach((v) => {
      const sys = (v.Id || '').toUpperCase() === sysDrive ? ' [System]' : ''
      storage.lines.push(`Volume ${val(v.Id)}${sys}: ${val(v.Fs)} | Total: ${v.Size ? gb(v.Size) : NA} GB | Free: ${v.Free !== undefined && v.Free !== null ? gb(v.Free) : NA} GB`)
    })
  } else {
    storage.lines.push(`Query: ${ERR} (Get-PhysicalDisk / Win32_LogicalDisk unavailable)`)
  }

  return { cpu, memory, gpu, board, bios, storage }
}

/* ----------------------------- Display ----------------------------- */

export function getDisplayLines(): string[] {
  try {
    if (!app.isReady()) return [`Query: ${UNKNOWN} (app not ready)`]
    const all = screen.getAllDisplays()
    const primary = screen.getPrimaryDisplay()
    const lines = [`Count: ${all.length}`]
    all.forEach((d, i) => {
      const isPrimary = d.id === primary.id
      const w = Math.round(d.size.width * d.scaleFactor)
      const h = Math.round(d.size.height * d.scaleFactor)
      lines.push(
        `Monitor ${i + 1}${isPrimary ? ' [Primary]' : ''}: ${d.label?.trim() || NA} | ${w}x${h} | ${d.displayFrequency ? d.displayFrequency + ' Hz' : NA} | Scale: ${Math.round(d.scaleFactor * 100)}%`
      )
    })
    return lines
  } catch (e: any) {
    return [`Query: ${ERR} (${e?.message || e})`]
  }
}

/* ----------------------------- Installation ----------------------------- */

export interface InstallInfo {
  type: string
  source: string
  familyName: string
  fullName: string
  version: string
  installLocation: string
  exePath: string
  exeDir: string
  isPackaged: boolean
  isPortable: boolean
  isStoreInstalled: string
}

/** Pure: parse "Name_Version_Arch_ResourceId_PublisherId" from a WindowsApps folder name. */
export function parsePackageFullName(folder: string): { name: string; version: string; publisherId: string; family: string } | null {
  const parts = folder.split('_')
  if (parts.length < 5) return null
  const [name, version, , , publisherId] = parts
  if (!name || !version || !publisherId) return null
  return { name, version, publisherId, family: `${name}_${publisherId}` }
}

export async function getInstallInfo(): Promise<InstallInfo> {
  const exePath = process.execPath
  const exeDir = dirname(exePath)
  const info: InstallInfo = {
    type: UNKNOWN,
    source: UNKNOWN,
    familyName: NA,
    fullName: NA,
    version: app.getVersion(),
    installLocation: exeDir,
    exePath,
    exeDir,
    isPackaged: false,
    isPortable: false,
    isStoreInstalled: UNKNOWN
  }
  // txapm's own answer (`txapm which TXAVL.TDrop --json` -> managed) is the install-source authority.
  const txapm = await refreshTxapmStatus()
  try {
    const inWindowsApps = exePath.toLowerCase().includes(`${sep}windowsapps${sep}`)
    const hasIdentity = !!process.windowsStore || inWindowsApps
    if (hasIdentity) {
      info.isPackaged = true
      info.type = 'MSIX'
      // The package folder is the first segment after WindowsApps.
      const seg = exePath.split(sep)
      const idx = seg.findIndex((s) => s.toLowerCase() === 'windowsapps')
      const folder = idx >= 0 ? seg[idx + 1] : ''
      const parsed = folder ? parsePackageFullName(folder) : null
      if (parsed) {
        info.fullName = folder
        info.familyName = parsed.family
        info.version = parsed.version
        info.installLocation = seg.slice(0, idx + 2).join(sep)
        // SignatureKind is the only reliable proof of distribution channel.
        const sig = await psJson<{ S?: string }>(
          `@{S=[string](Get-AppxPackage -Name '${parsed.name.replace(/[^\w.\-]/g, '')}' | select -First 1).SignatureKind}|ConvertTo-Json -Compress`,
          6000
        )
        const kind = sig?.S?.trim()
        if (kind === 'Store') {
          info.source = 'Microsoft Store (SignatureKind=Store)'
          info.isStoreInstalled = 'true'
        } else if (kind === 'Developer' || kind === 'Enterprise') {
          info.type = 'MSIX (Sideload)'
          info.source = `Sideload (SignatureKind=${kind})`
          info.isStoreInstalled = 'false'
        } else if (kind) {
          info.source = `${UNKNOWN} (SignatureKind=${kind})`
        }
      }
    } else if (!app.isPackaged) {
      info.type = 'Development build'
      info.source = 'Local development'
      info.isStoreInstalled = 'false'
    } else if (process.env.PORTABLE_EXECUTABLE_DIR) {
      info.type = 'Portable'
      info.source = 'electron-builder portable'
      info.isPortable = true
      info.isPackaged = true
      info.isStoreInstalled = 'false'
    } else {
      info.isPackaged = true
      info.isStoreInstalled = 'false'
      if (existsSync(join(exeDir, 'Uninstall T-Drop.exe')) || existsSync(join(exeDir, 'Uninstall T-Drop.exe.nsis'))) {
        info.type = 'EXE Installer'
        info.source = 'NSIS installer'
      } else {
        info.type = 'Extracted Application'
        info.source = UNKNOWN
        info.isPortable = true
      }
    }
  } catch {
    /* keep UNKNOWN values */
  }
  if (txapm?.managed && !info.isStoreInstalled.startsWith('true')) {
    info.source = `TXA Repo (txapm managed${txapm.version ? `, v${txapm.version}` : ''}${txapm.dir ? `, dir=${txapm.dir}` : ''})`
  } else if (txapm && !txapm.managed && info.type === 'EXE Installer') {
    info.source = 'Standalone EXE installer (not managed by txapm)'
  }
  return info
}
