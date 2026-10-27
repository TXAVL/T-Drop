/**
 * Payment receipt → A4 PDF in the user's Downloads folder, then opened in the
 * default PDF viewer (where it can be printed).
 *
 * The HTML is built here from structured data (never taken from the renderer as
 * markup) and rendered in a hidden, sandboxed window with JavaScript disabled.
 */
import { app, BrowserWindow, shell } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildReceiptHtml, receiptFileName, type ReceiptData } from '../../shared/receipt'
import { AppLogger } from './logger'

export async function saveReceiptPdf(data: ReceiptData): Promise<{ ok: boolean; path?: string; error?: string }> {
  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1270,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  try {
    const html = buildReceiptHtml(data)
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
      preferCSSPageSize: true
    })
    const path = join(app.getPath('downloads'), `${receiptFileName(data.orderCode)}.pdf`)
    writeFileSync(path, pdf)
    AppLogger.write('INFO', 'License', `Đã lưu biên nhận thanh toán: ${path}`)
    const openErr = await shell.openPath(path)
    if (openErr) AppLogger.write('WARN', 'License', `Không mở được biên nhận: ${openErr}`)
    return { ok: true, path }
  } catch (err) {
    const message = (err as Error)?.message || String(err)
    AppLogger.write('ERROR', 'License', `Lỗi tạo biên nhận PDF: ${message}`)
    return { ok: false, error: message }
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}
