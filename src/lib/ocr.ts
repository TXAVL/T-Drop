/**
 * OCR Engine for T-Drop using Tesseract.js (WebAssembly client-side engine).
 * Recognizes text from image dataUrls or image files.
 * Supports Vietnamese & English text recognition.
 */
import { createWorker } from 'tesseract.js'

export interface OcrResult {
  text: string
  confidence: number
  linesCount: number
  wordsCount: number
}

let activeWorker: any = null
let activeLang = ''

/**
 * Get or initialize Tesseract worker with specified language.
 */
async function getOcrWorker(lang = 'vie+eng', onProgress?: (p: number, status: string) => void) {
  if (activeWorker && activeLang === lang) {
    return activeWorker
  }

  if (activeWorker) {
    try {
      await activeWorker.terminate()
    } catch {}
    activeWorker = null
  }

  const worker = await createWorker(lang, 1, {
    logger: (m: any) => {
      if (m && typeof m.progress === 'number' && onProgress) {
        onProgress(Math.round(m.progress * 100), m.status || 'Đang xử lý...')
      }
    }
  })

  activeWorker = worker
  activeLang = lang
  return activeWorker
}

/**
 * Extract text from an image source (dataUrl, blob, or URL).
 */
export async function extractTextFromImage(
  imageSrc: string,
  lang = 'vie+eng',
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  // 1. Try Native Electron Main Process IPC first (fast, reliable, zero CSP/worker hurdles)
  if (typeof window !== 'undefined' && (window as any).edge?.extractOcrText) {
    let unsub: (() => void) | null = null
    if (onProgress && (window as any).edge?.onOcrProgress) {
      unsub = (window as any).edge.onOcrProgress((info: { progress: number; status: string }) => {
        onProgress(info.progress, info.status)
      })
    }
    try {
      const res = await (window as any).edge.extractOcrText({ imageSrc, lang })
      if (res && res.ok && typeof res.text === 'string') {
        return {
          text: res.text,
          confidence: res.confidence ?? 0,
          linesCount: res.linesCount ?? 0,
          wordsCount: res.wordsCount ?? 0
        }
      }
      if (res && !res.ok) {
        console.warn('[OCR] IPC OCR returned error, falling back to client worker:', res.error)
      }
    } catch (err) {
      console.warn('[OCR] IPC OCR call threw, falling back to client worker:', err)
    } finally {
      if (unsub) unsub()
    }
  }

  // 2. Client-side Tesseract.js WebAssembly Fallback
  let targetSrc = imageSrc
  if (imageSrc.startsWith('edgelocal://') && typeof window !== 'undefined' && (window as any).edge?.getImageDataUrl) {
    try {
      const dataUrl = await (window as any).edge.getImageDataUrl(imageSrc)
      if (dataUrl) targetSrc = dataUrl
    } catch {}
  }

  const worker = await getOcrWorker(lang, onProgress)
  const ret = await worker.recognize(targetSrc)

  const rawText = ret.data?.text || ''
  const confidence = Math.round(ret.data?.confidence || 0)

  // Clean and normalize text
  const cleanedText = rawText
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string, idx: number, arr: string[]) => {
      // Don't keep consecutive empty lines
      if (l === '' && arr[idx - 1] === '') return false
      return true
    })
    .join('\n')
    .trim()

  const wordsCount = cleanedText ? cleanedText.split(/\s+/).filter(Boolean).length : 0
  const linesCount = cleanedText ? cleanedText.split('\n').filter(Boolean).length : 0

  return {
    text: cleanedText,
    confidence,
    linesCount,
    wordsCount
  }
}

/**
 * Terminate any active worker when done or cleaning up memory.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (activeWorker) {
    try {
      await activeWorker.terminate()
    } catch {}
    activeWorker = null
    activeLang = ''
  }
}
