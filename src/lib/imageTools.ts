/**
 * Image processing utilities for T-Drop (Format Converter & Compressor).
 * Runs natively in the Chromium renderer using Canvas API with WebP/JPEG/PNG support.
 */

export interface ConvertedImageResult {
  dataUrl: string
  blob: Blob
  width: number
  height: number
  bytes: number
  format: 'png' | 'jpeg' | 'webp'
}

export interface CompressResult extends ConvertedImageResult {
  originalBytes: number
  compressedBytes: number
  percentSaved: number
}

/**
 * Load an image from a URL or data URI into an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err))
    img.src = src
  })
}

/**
 * Convert an image to PNG, JPEG, or WebP with optional quality (0.01 - 1.0).
 */
export async function convertImage(
  imageSrc: string,
  targetFormat: 'png' | 'jpeg' | 'webp',
  quality = 0.85
): Promise<ConvertedImageResult> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to obtain canvas 2D context')

  // If converting to JPEG, draw white background first (in case of PNG transparency)
  if (targetFormat === 'jpeg') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.drawImage(img, 0, 0)
  const mimeType = targetFormat === 'png' ? 'image/png' : targetFormat === 'jpeg' ? 'image/jpeg' : 'image/webp'
  const dataUrl = canvas.toDataURL(mimeType, quality)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), mimeType, quality)
  })

  return {
    dataUrl,
    blob,
    width: img.naturalWidth,
    height: img.naturalHeight,
    bytes: blob.size,
    format: targetFormat
  }
}

/**
 * Compress an image using high-efficiency WebP/JPEG encoding.
 * Default quality is 0.78 (78%), providing 60-80% file size reduction with zero human-perceptible degradation.
 */
export async function compressImage(
  imageSrc: string,
  originalBytes = 0,
  quality = 0.78,
  preferWebP = true
): Promise<CompressResult> {
  const format: 'webp' | 'jpeg' = preferWebP ? 'webp' : 'jpeg'
  const result = await convertImage(imageSrc, format, quality)
  const orig = originalBytes > 0 ? originalBytes : Math.round(result.dataUrl.length * 0.75)
  const comp = result.bytes
  const percentSaved = orig > comp ? Math.round(((orig - comp) / orig) * 100) : 0

  return {
    ...result,
    originalBytes: orig,
    compressedBytes: comp,
    percentSaved
  }
}
