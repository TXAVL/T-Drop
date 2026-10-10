/**
 * T-Drop Encrypted Backup & Restore Archive (.txa) Engine.
 *
 * Implements a proprietary, tamper-proof, compressed and encrypted backup format:
 * - Header: Human-readable warning banner so opening in Notepad informs the user
 *   that this is an encrypted T-Drop archive.
 * - Binary Container: AES-256-GCM authenticated encryption + gzip compression.
 * - Payload: Bundles history items, user settings, binary screenshots/images, and text payloads.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { PATHS } from './paths'
import type { ClipboardItem, Settings } from '../../shared/types'

const TXA_MAGIC_HEADER = `TXA-ARCHIVE-V1 [ENCRYPTED T-DROP BACKUP]
================================================================================
CẢNH BÁO / WARNING:
Tệp này là bản sao lưu dữ liệu đã được mã hóa của ứng dụng T-Drop (.txa).
Nếu mở bằng Notepad hoặc trình soạn thảo văn bản, tệp sẽ hiển thị ký tự mã hóa lỗi font.
Để xem và khôi phục lịch sử bảng tạm, vui lòng mở tệp này bằng ứng dụng T-Drop.
This is an encrypted T-Drop archive. Open with T-Drop: https://github.com/TXAVLOG/T-Drop
================================================================================
\x00TXA_BINARY_PAYLOAD_START\x00\r\n`

const KDF_SALT = Buffer.from('T-DROP-SECURE-VAULT-SALT-v1', 'utf8')
const KDF_SECRET = 'TXAVLOG-T-DROP-AES-GCM-KEY-2026'

function deriveKey(salt: Buffer): Buffer {
  return pbkdf2Sync(KDF_SECRET, salt, 10000, 32, 'sha256')
}

export interface TxaManifest {
  app: 'T-Drop'
  version: string
  createdAt: string
  itemsCount: number
  imagesCount: number
  payloadsCount: number
}

export interface TxaArchiveData {
  manifest: TxaManifest
  settings: Partial<Settings>
  items: ClipboardItem[]
  images: Record<string, string> // fileName -> base64
  payloads: Record<string, string> // fileName -> utf8 text
}

export interface BackupCreateResult {
  ok: boolean
  filePath?: string
  manifest?: TxaManifest
  fileSizeBytes?: number
  error?: string
}

export interface BackupPreviewResult {
  ok: boolean
  manifest?: TxaManifest
  filePath?: string
  error?: string
}

export interface BackupRestoreResult {
  ok: boolean
  restoredItemsCount?: number
  mode?: 'merge' | 'overwrite'
  error?: string
}

/** Mutex flag to prevent concurrent backup/restore race conditions */
let backupBusy = false

export function isBackupBusy(): boolean {
  return backupBusy
}

/**
 * Creates an encrypted `.txa` file at the specified `targetPath`.
 */
export function createTxaBackup(targetPath: string): BackupCreateResult {
  if (backupBusy) {
    return { ok: false, error: 'busy' }
  }
  backupBusy = true

  try {
    const itemsFile = PATHS.indexFile()
    const settingsFile = PATHS.settingsFile()
    const imagesDir = PATHS.imagesDir()
    const payloadsDir = PATHS.payloadsDir()

    // 1. Read items & settings
    let items: ClipboardItem[] = []
    if (existsSync(itemsFile)) {
      try {
        items = JSON.parse(readFileSync(itemsFile, 'utf8'))
      } catch {
        items = []
      }
    }

    let settings: Partial<Settings> = {}
    if (existsSync(settingsFile)) {
      try {
        settings = JSON.parse(readFileSync(settingsFile, 'utf8'))
      } catch {
        settings = {}
      }
    }

    // 2. Read images into base64 mapping
    const images: Record<string, string> = {}
    if (existsSync(imagesDir)) {
      try {
        const files = readdirSync(imagesDir)
        for (const file of files) {
          try {
            const p = join(imagesDir, file)
            const buf = readFileSync(p)
            images[file] = buf.toString('base64')
          } catch {
            /* ignore individual corrupted image */
          }
        }
      } catch {
        /* ignore directory reading errors */
      }
    }

    // 3. Read text payloads
    const payloads: Record<string, string> = {}
    if (existsSync(payloadsDir)) {
      try {
        const files = readdirSync(payloadsDir)
        for (const file of files) {
          try {
            const p = join(payloadsDir, file)
            payloads[file] = readFileSync(p, 'utf8')
          } catch {
            /* ignore individual payload read error */
          }
        }
      } catch {
        /* ignore directory read error */
      }
    }

    const manifest: TxaManifest = {
      app: 'T-Drop',
      version: '0.3.2',
      createdAt: new Date().toISOString(),
      itemsCount: items.length,
      imagesCount: Object.keys(images).length,
      payloadsCount: Object.keys(payloads).length
    }

    const archiveData: TxaArchiveData = {
      manifest,
      settings,
      items,
      images,
      payloads
    }

    // 4. Compress with gzip
    const jsonStr = JSON.stringify(archiveData)
    const compressed = gzipSync(Buffer.from(jsonStr, 'utf8'))

    // 5. Encrypt with AES-256-GCM
    const iv = randomBytes(12)
    const key = deriveKey(KDF_SALT)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()])
    const tag = cipher.getAuthTag()

    // 6. Build file structure:
    // Header string + [IV (12 bytes)] + [Auth Tag (16 bytes)] + [Encrypted Data]
    const headerBuf = Buffer.from(TXA_MAGIC_HEADER, 'utf8')
    const finalBuffer = Buffer.concat([headerBuf, iv, tag, encrypted])

    writeFileSync(targetPath, finalBuffer)

    return {
      ok: true,
      filePath: targetPath,
      manifest,
      fileSizeBytes: finalBuffer.length
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    backupBusy = false
  }
}

/**
 * Decrypts and unpacks a `.txa` archive buffer or file path.
 */
export function unpackTxaBackup(source: string | Buffer): { ok: boolean; data?: TxaArchiveData; error?: string } {
  try {
    const rawBuffer = typeof source === 'string' ? readFileSync(source) : source

    // Verify magic header
    const headerBuf = Buffer.from(TXA_MAGIC_HEADER, 'utf8')
    if (rawBuffer.length < headerBuf.length + 28) {
      return { ok: false, error: 'invalid_format' }
    }

    const headerSlice = rawBuffer.subarray(0, headerBuf.length)
    if (!headerSlice.equals(headerBuf)) {
      return { ok: false, error: 'invalid_header' }
    }

    let offset = headerBuf.length
    const iv = rawBuffer.subarray(offset, offset + 12)
    offset += 12
    const tag = rawBuffer.subarray(offset, offset + 16)
    offset += 16
    const encrypted = rawBuffer.subarray(offset)

    const key = deriveKey(KDF_SALT)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)

    const decryptedCompressed = Buffer.concat([decipher.update(encrypted), decipher.final()])
    const decompressed = gunzipSync(decryptedCompressed)
    const parsed = JSON.parse(decompressed.toString('utf8')) as TxaArchiveData

    if (parsed.manifest?.app !== 'T-Drop') {
      return { ok: false, error: 'unsupported_app' }
    }

    return { ok: true, data: parsed }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Previews metadata from a `.txa` archive without applying it.
 */
export function previewTxaBackup(filePath: string): BackupPreviewResult {
  const res = unpackTxaBackup(filePath)
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || 'failed_to_unpack' }
  }
  return {
    ok: true,
    manifest: res.data.manifest,
    filePath
  }
}

/**
 * Restores data from a `.txa` archive.
 * mode: 'merge' (default) preserves existing items and appends new ones;
 * mode: 'overwrite' cleanly replaces current items and settings.
 */
export function restoreTxaBackup(
  filePath: string,
  mode: 'merge' | 'overwrite' = 'merge'
): BackupRestoreResult {
  if (backupBusy) {
    return { ok: false, error: 'busy' }
  }
  backupBusy = true

  try {
    const unpackRes = unpackTxaBackup(filePath)
    if (!unpackRes.ok || !unpackRes.data) {
      return { ok: false, error: unpackRes.error || 'unpack_failed' }
    }

    const backupData = unpackRes.data
    const imagesDir = PATHS.imagesDir()
    const payloadsDir = PATHS.payloadsDir()
    mkdirSync(imagesDir, { recursive: true })
    mkdirSync(payloadsDir, { recursive: true })

    // 1. Restore images to disk
    if (backupData.images) {
      for (const [fileName, b64] of Object.entries(backupData.images)) {
        try {
          const dest = join(imagesDir, fileName)
          writeFileSync(dest, Buffer.from(b64, 'base64'))
        } catch {
          /* ignore individual image write error */
        }
      }
    }

    // 2. Restore text payloads to disk
    if (backupData.payloads) {
      for (const [fileName, text] of Object.entries(backupData.payloads)) {
        try {
          const dest = join(payloadsDir, fileName)
          writeFileSync(dest, text, 'utf8')
        } catch {
          /* ignore individual payload write error */
        }
      }
    }

    // 3. Restore items
    const itemsFile = PATHS.indexFile()
    let currentItems: ClipboardItem[] = []
    if (existsSync(itemsFile)) {
      try {
        currentItems = JSON.parse(readFileSync(itemsFile, 'utf8'))
      } catch {
        currentItems = []
      }
    }

    let finalItems: ClipboardItem[] = []
    if (mode === 'overwrite') {
      finalItems = backupData.items || []
    } else {
      // Merge mode: Existing items stay, new non-duplicate items are merged
      const existingIds = new Set(currentItems.map((i) => i.id))
      const toAdd = (backupData.items || []).filter((i) => !existingIds.has(i.id))
      finalItems = [...currentItems, ...toAdd]
    }

    writeFileSync(itemsFile, JSON.stringify(finalItems, null, 2), 'utf8')

    // 4. Restore settings if overwrite or if missing
    if (backupData.settings && Object.keys(backupData.settings).length > 0) {
      const settingsFile = PATHS.settingsFile()
      let currentSettings: Record<string, unknown> = {}
      if (existsSync(settingsFile)) {
        try {
          currentSettings = JSON.parse(readFileSync(settingsFile, 'utf8'))
        } catch {
          currentSettings = {}
        }
      }
      const newSettings = mode === 'overwrite'
        ? { ...backupData.settings }
        : { ...backupData.settings, ...currentSettings }
      writeFileSync(settingsFile, JSON.stringify(newSettings, null, 2), 'utf8')
    }

    return {
      ok: true,
      restoredItemsCount: backupData.items?.length || 0,
      mode
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    backupBusy = false
  }
}
