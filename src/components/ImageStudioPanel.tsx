/**
 * ImageStudioPanel — Interactive Image Studio inside Preview Flyout.
 * Features 1-click format conversion (PNG, JPG, WebP), smart image compression,
 * and AI OCR Text Extraction (VIP 30-day / PREMIUM 60-day feature).
 */
import { useState, useCallback, useEffect } from 'react'
import { convertImage, compressImage, type CompressResult } from '../lib/imageTools'
import { extractTextFromImage, type OcrResult } from '../lib/ocr'
import { formatBytes } from '../lib/format'
import { playButtonClickSound } from '../lib/soundEffects'
import { useStore } from '../store/appStore'
import { CopyIcon, FolderOpenIcon, CheckIcon, OcrIcon, CrownIcon } from './icons'
import { t } from '../i18n'

interface ImageStudioPanelProps {
  imageSrc: string
  originalBytes?: number
  defaultName?: string
  width?: number
  height?: number
}

export function ImageStudioPanel({
  imageSrc,
  originalBytes = 0,
  defaultName = 't-drop-image',
  width,
  height
}: ImageStudioPanelProps) {
  const [activeTab, setActiveTab] = useState<'convert' | 'compress' | 'ocr'>('convert')
  const [convertFormat, setConvertFormat] = useState<'png' | 'jpeg' | 'webp'>('webp')
  const [quality, setQuality] = useState(0.85)
  const [converting, setConverting] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null)
  const [copiedSuccess, setCopiedSuccess] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  // OCR state
  const [ocrLang, setOcrLang] = useState<'vie+eng' | 'eng' | 'vie'>('vie+eng')
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [ocrCopied, setOcrCopied] = useState(false)
  const [ocrCopiedMarkdown, setOcrCopiedMarkdown] = useState(false)
  const [ocrSavedTxt, setOcrSavedTxt] = useState(false)
  const [ocrAddedToHistory, setOcrAddedToHistory] = useState(false)

  const settings = useStore((s) => s.settings)
  const isPro = Boolean(settings.isPro && (settings.licenseRole === 'VIP' || settings.licenseRole === 'PREMIUM'))
  const isPremium = Boolean(settings.isPro && settings.licenseRole === 'PREMIUM')
  const role = settings.licenseRole || 'FREE'

  const [autoOcr, setAutoOcr] = useState<boolean>(() => {
    return localStorage.getItem('tdrop_auto_ocr') === 'true'
  })

  // Handle Format Convert & Copy
  const handleConvertAndCopy = useCallback(async () => {
    if (converting) return
    setConverting(true)
    playButtonClickSound()
    try {
      const res = await convertImage(imageSrc, convertFormat, quality)
      await window.edge.copyImageDataUrl(res.dataUrl)
      useStore.getState().triggerCopyFlare()
      setCopiedSuccess('convert')
      setTimeout(() => setCopiedSuccess(null), 1500)
      useStore.getState().pushToast({
        id: `convert-copy-${Date.now()}`,
        message: `Đã chuyển đổi và sao chép ảnh (${convertFormat === 'jpeg' ? 'JPG' : convertFormat.toUpperCase()})!`,
        tone: 'info'
      })
    } catch (err: any) {
      console.error('[ImageStudio] Convert & Copy failed:', err)
      useStore.getState().pushToast({
        id: `convert-err-${Date.now()}`,
        message: 'Chuyển đổi ảnh thất bại: ' + (err?.message || 'Lỗi không xác định'),
        tone: 'error'
      })
    } finally {
      setConverting(false)
    }
  }, [imageSrc, convertFormat, quality, converting])

  // Handle Convert & Save to File
  const handleConvertAndSave = useCallback(async () => {
    if (converting) return
    setConverting(true)
    playButtonClickSound()
    try {
      const res = await convertImage(imageSrc, convertFormat, quality)
      const ext = convertFormat === 'jpeg' ? 'jpg' : convertFormat
      const base = defaultName.replace(/\.[a-zA-Z0-9]+$/, '')
      const fileName = `${base}.${ext}`
      const saveRes = await window.edge.saveImageFile({ dataUrl: res.dataUrl, defaultName: fileName })
      if (saveRes.ok) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 2000)
        useStore.getState().pushToast({
          id: `save-ok-${Date.now()}`,
          message: 'Đã lưu tệp ảnh thành công!',
          tone: 'info'
        })
      }
    } catch (err: any) {
      console.error('[ImageStudio] Save failed:', err)
      useStore.getState().pushToast({
        id: `save-err-${Date.now()}`,
        message: 'Lưu tệp thất bại: ' + (err?.message || 'Lỗi không xác định'),
        tone: 'error'
      })
    } finally {
      setConverting(false)
    }
  }, [imageSrc, convertFormat, quality, defaultName, converting])

  // Handle Compress
  const handleCompress = useCallback(async (compressQuality = 0.78) => {
    if (compressing) return
    setCompressing(true)
    playButtonClickSound()
    try {
      const res = await compressImage(imageSrc, originalBytes, compressQuality, true)
      setCompressResult(res)
      useStore.getState().pushToast({
        id: `compress-ok-${Date.now()}`,
        message: `Đã nén ảnh thành công: Giảm ${res.percentSaved}% dung lượng!`,
        tone: 'info'
      })
    } catch (err: any) {
      console.error('[ImageStudio] Compress failed:', err)
      useStore.getState().pushToast({
        id: `compress-err-${Date.now()}`,
        message: 'Nén ảnh thất bại: ' + (err?.message || 'Lỗi không xác định'),
        tone: 'error'
      })
    } finally {
      setCompressing(false)
    }
  }, [imageSrc, originalBytes, compressing])

  // Copy Compressed result
  const handleCopyCompressed = useCallback(async () => {
    if (!compressResult) return
    playButtonClickSound()
    await window.edge.copyImageDataUrl(compressResult.dataUrl)
    useStore.getState().triggerCopyFlare()
    setCopiedSuccess('compress')
    setTimeout(() => setCopiedSuccess(null), 1500)
  }, [compressResult])

  // Save Compressed result
  const handleSaveCompressed = useCallback(async () => {
    if (!compressResult) return
    playButtonClickSound()
    const base = defaultName.replace(/\.[a-zA-Z0-9]+$/, '')
    const fileName = `${base}-compressed.webp`
    const saveRes = await window.edge.saveImageFile({ dataUrl: compressResult.dataUrl, defaultName: fileName })
    if (saveRes.ok) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    }
  }, [compressResult, defaultName])

  // Handle OCR Extraction
  const handleStartOcr = useCallback(async () => {
    if (!isPro) {
      useStore.getState().pushToast({
        id: `ocr-pro-required-${Date.now()}`,
        message: 'Tính năng trích chữ OCR yêu cầu kích hoạt bản quyền VIP hoặc PREMIUM!',
        tone: 'error'
      })
      useStore.getState().setSettingsOpen(true)
      return
    }
    if (ocrRunning || !imageSrc) return
    setOcrRunning(true)
    setOcrProgress(5)
    setOcrStatus('Đang chuẩn bị mô hình nhận diện...')
    playButtonClickSound()

    try {
      const result = await extractTextFromImage(imageSrc, ocrLang, (p, s) => {
        setOcrProgress(p)
        setOcrStatus(s)
      })
      setOcrResult(result)
      if (result.text) {
        useStore.getState().pushToast({
          id: `ocr-ok-${Date.now()}`,
          message: `Đã trích xuất ${result.wordsCount} từ thành công!`,
          tone: 'info'
        })
      } else {
        setOcrStatus('Không tìm thấy văn bản rõ ràng trong ảnh.')
      }
    } catch (err: any) {
      console.error('[ImageStudio] OCR failed:', err)
      setOcrStatus('Nhận diện thất bại: ' + (err?.message || 'Lỗi tải mô hình.'))
      useStore.getState().pushToast({
        id: `ocr-err-${Date.now()}`,
        message: 'Trích xuất chữ thất bại!',
        tone: 'error'
      })
    } finally {
      setOcrRunning(false)
    }
  }, [imageSrc, ocrLang, ocrRunning, isPro])

  // Copy OCR Text
  const handleCopyOcrText = useCallback(() => {
    if (!ocrResult?.text) return
    playButtonClickSound()
    navigator.clipboard.writeText(ocrResult.text)
    useStore.getState().triggerCopyFlare()
    setOcrCopied(true)
    setTimeout(() => setOcrCopied(false), 1500)
  }, [ocrResult])

  // Add OCR Text to T-Drop Clipboard History
  const handleAddOcrToHistory = useCallback(async () => {
    if (!ocrResult?.text) return
    playButtonClickSound()
    try {
      await window.edge.addItemData({
        kind: 'text',
        text: ocrResult.text,
        isUrl: false
      })
      setOcrAddedToHistory(true)
      setTimeout(() => setOcrAddedToHistory(false), 2000)
    } catch (err) {
      console.error('[ImageStudio] Failed to add OCR text to history:', err)
    }
  }, [ocrResult])

  // Toggle Auto-OCR (PREMIUM Exclusive)
  const handleToggleAutoOcr = useCallback(() => {
    if (!isPremium) {
      playButtonClickSound()
      useStore.getState().pushToast({
        id: `premium-auto-ocr-${Date.now()}`,
        message: t('imageStudio.premiumRequired') || 'Tính năng Auto-OCR tự động dành riêng cho gói PREMIUM!',
        tone: 'error'
      })
      useStore.getState().setSettingsOpen(true)
      return
    }
    playButtonClickSound()
    setAutoOcr((prev) => {
      const next = !prev
      localStorage.setItem('tdrop_auto_ocr', String(next))
      return next
    })
  }, [isPremium])

  // Smart Clean / Unwrap lines (PREMIUM Exclusive)
  const handleUnwrapLines = useCallback(() => {
    if (!ocrResult?.text) return
    if (!isPremium) {
      playButtonClickSound()
      useStore.getState().pushToast({
        id: `premium-unwrap-${Date.now()}`,
        message: t('imageStudio.premiumRequired') || 'Tính năng làm sạch ngắt dòng dành riêng cho gói PREMIUM!',
        tone: 'error'
      })
      useStore.getState().setSettingsOpen(true)
      return
    }
    playButtonClickSound()
    const unwrapped = ocrResult.text
      .split(/\n{2,}/)
      .map((p) => p.replace(/([^\.\?\!\:\n])\n([^\.\?\!\:\n])/g, '$1 $2'))
      .join('\n\n')
    setOcrResult({ ...ocrResult, text: unwrapped })
    useStore.getState().pushToast({
      id: `unwrap-ok-${Date.now()}`,
      message: t('imageStudio.ocrUnwrapped') || 'Đã nối dòng thành đoạn văn!',
      tone: 'info'
    })
  }, [ocrResult, isPremium])

  // Copy as Markdown (PREMIUM Exclusive)
  const handleCopyMarkdown = useCallback(() => {
    if (!ocrResult?.text) return
    if (!isPremium) {
      playButtonClickSound()
      useStore.getState().pushToast({
        id: `premium-md-${Date.now()}`,
        message: t('imageStudio.premiumRequired') || 'Tính năng sao chép Markdown dành riêng cho gói PREMIUM!',
        tone: 'error'
      })
      useStore.getState().setSettingsOpen(true)
      return
    }
    playButtonClickSound()
    navigator.clipboard.writeText(ocrResult.text.trim())
    useStore.getState().triggerCopyFlare()
    setOcrCopiedMarkdown(true)
    setTimeout(() => setOcrCopiedMarkdown(false), 1500)
    useStore.getState().pushToast({
      id: `md-ok-${Date.now()}`,
      message: t('imageStudio.ocrCopiedMarkdown') || 'Đã sao chép Markdown!',
      tone: 'info'
    })
  }, [ocrResult, isPremium])

  // Save Text File (PREMIUM Exclusive)
  const handleSaveTxtFile = useCallback(async () => {
    if (!ocrResult?.text) return
    if (!isPremium) {
      playButtonClickSound()
      useStore.getState().pushToast({
        id: `premium-save-${Date.now()}`,
        message: t('imageStudio.premiumRequired') || 'Tính năng xuất file .TXT dành riêng cho gói PREMIUM!',
        tone: 'error'
      })
      useStore.getState().setSettingsOpen(true)
      return
    }
    playButtonClickSound()
    const base = defaultName.replace(/\.[a-zA-Z0-9]+$/, '')
    const fileName = `${base}-ocr.txt`
    const res = await window.edge.saveTextFile({ content: ocrResult.text, defaultName: fileName })
    if (res.ok) {
      setOcrSavedTxt(true)
      setTimeout(() => setOcrSavedTxt(false), 2000)
      useStore.getState().pushToast({
        id: `save-txt-${Date.now()}`,
        message: t('imageStudio.ocrSavedTxt') || 'Đã lưu file .TXT thành công!',
        tone: 'info'
      })
    }
  }, [ocrResult, isPremium, defaultName])

  // Auto-OCR on open if Premium enabled
  useEffect(() => {
    if (activeTab === 'ocr' && isPremium && autoOcr && !ocrResult && !ocrRunning && imageSrc) {
      handleStartOcr()
    }
  }, [activeTab, isPremium, autoOcr, ocrResult, ocrRunning, imageSrc, handleStartOcr])

  return (
    <div className="image-studio-wrap" onClick={(e) => e.stopPropagation()}>
      <div className="image-studio-header">
        <span>{t('imageStudio.title') || 'Tiện ích Ảnh'}</span>
        {width && height ? <span>{width} × {height}</span> : null}
      </div>

      <div className="image-studio-tabs">
        <button
          type="button"
          className={`image-studio-tab${activeTab === 'convert' ? ' active' : ''}`}
          onClick={() => { setActiveTab('convert'); playButtonClickSound() }}
        >
          {t('imageStudio.tabConvert') || 'Chuyển định dạng'}
        </button>
        <button
          type="button"
          className={`image-studio-tab${activeTab === 'compress' ? ' active' : ''}`}
          onClick={() => { setActiveTab('compress'); playButtonClickSound() }}
        >
          {t('imageStudio.tabCompress') || 'Nén dung lượng'}
        </button>
        <button
          type="button"
          className={`image-studio-tab${activeTab === 'ocr' ? ' active' : ''}`}
          onClick={() => { setActiveTab('ocr'); playButtonClickSound() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <OcrIcon width={12} height={12} />
          <span>{t('imageStudio.tabOcr') || 'Trích chữ (OCR)'}</span>
          {!isPro ? (
            <span style={{ fontSize: 9, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', padding: '1px 5px', borderRadius: 99, color: '#fff', fontWeight: 700 }}>PRO</span>
          ) : role === 'PREMIUM' ? (
            <span style={{ fontSize: 9, background: 'linear-gradient(135deg, #a855f7, #6366f1)', padding: '1px 5px', borderRadius: 99, color: '#fff', fontWeight: 700 }}>PREMIUM</span>
          ) : (
            <span style={{ fontSize: 9, background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '1px 5px', borderRadius: 99, color: '#000', fontWeight: 700 }}>VIP</span>
          )}
        </button>
      </div>

      {activeTab === 'convert' && (
        <>
          <div className="image-studio-row">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              {t('imageStudio.targetFormat') || 'Định dạng đích'}:
            </span>
            <div className="image-format-pills">
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`image-tool-btn${convertFormat === fmt ? ' active' : ''}`}
                  onClick={() => { setConvertFormat(fmt); playButtonClickSound() }}
                >
                  {fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {convertFormat !== 'png' && (
            <div className="image-studio-row">
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {t('imageStudio.quality') || 'Chất lượng'}: {Math.round(quality * 100)}%
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0.65, 0.78, 0.88, 0.95].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={`image-tool-btn${quality === q ? ' active' : ''}`}
                    onClick={() => { setQuality(q); playButtonClickSound() }}
                  >
                    {Math.round(q * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="image-studio-actions">
            <button
              type="button"
              className="image-studio-btn primary"
              disabled={converting}
              onClick={handleConvertAndCopy}
            >
              {copiedSuccess === 'convert' ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
              {copiedSuccess === 'convert'
                ? (t('imageStudio.copied') || 'Đã chép vào clipboard!')
                : (t('imageStudio.convertCopy') || `Sao chép ${convertFormat === 'jpeg' ? 'JPG' : convertFormat.toUpperCase()}`)}
            </button>
            <button
              type="button"
              className="image-studio-btn"
              disabled={converting}
              onClick={handleConvertAndSave}
            >
              {savedSuccess ? <CheckIcon width={13} height={13} /> : <FolderOpenIcon width={13} height={13} />}
              {savedSuccess ? (t('imageStudio.saved') || 'Đã lưu!') : (t('imageStudio.saveAs') || 'Lưu tệp...')}
            </button>
          </div>
        </>
      )}

      {activeTab === 'compress' && (
        <>
          <div className="image-studio-row">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              {t('imageStudio.compressMode') || 'Mức độ nén'}:
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { label: 'Cân bằng', q: 0.78 },
                { label: 'Tối đa', q: 0.65 },
                { label: 'Chất lượng cao', q: 0.88 }
              ].map(({ label, q }) => (
                <button
                  key={q}
                  type="button"
                  className="image-tool-btn compress-btn"
                  onClick={() => handleCompress(q)}
                >
                  {label} ({Math.round(q * 100)}%)
                </button>
              ))}
            </div>
          </div>

          {compressResult ? (
            <div className="compress-stat-card">
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{formatBytes(compressResult.originalBytes)}</span>
                <span style={{ margin: '0 6px', color: '#10b981' }}>➔</span>
                <strong style={{ color: '#ffffff' }}>{formatBytes(compressResult.compressedBytes)}</strong>
              </div>
              <span className="compress-stat-badge">-{compressResult.percentSaved}%</span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '4px 0' }}>
              {t('imageStudio.compressHint') || 'Chọn mức độ nén ở trên để tối ưu dung lượng ảnh (giảm 50% - 80%)'}
            </div>
          )}

          {compressResult && (
            <div className="image-studio-actions">
              <button
                type="button"
                className="image-studio-btn emerald"
                onClick={handleCopyCompressed}
              >
                {copiedSuccess === 'compress' ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
                {copiedSuccess === 'compress' ? (t('imageStudio.copied') || 'Đã chép!') : (t('imageStudio.copyCompressed') || 'Sao chép ảnh đã nén')}
              </button>
              <button
                type="button"
                className="image-studio-btn"
                onClick={handleSaveCompressed}
              >
                {savedSuccess ? <CheckIcon width={13} height={13} /> : <FolderOpenIcon width={13} height={13} />}
                {savedSuccess ? (t('imageStudio.saved') || 'Đã lưu!') : (t('imageStudio.saveCompressed') || 'Lưu file WebP...')}
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'ocr' && (
        <>
          {!isPro ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CrownIcon width={16} height={16} fill="#f59e0b" />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#f59e0b' }}>
                  {t('imageStudio.ocrProTitle') || 'Tính năng VIP & PREMIUM: Trích chữ AI (OCR)'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                {t('imageStudio.ocrProDesc') || 'Tự động nhận diện chữ tiếng Việt & tiếng Anh từ hình ảnh bằng mô hình AI client-side nhanh chóng và bảo mật.'}
              </p>
              <button
                type="button"
                className="image-studio-btn primary"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 11.5,
                  alignSelf: 'flex-start',
                  marginTop: 4
                }}
                onClick={() => {
                  playButtonClickSound()
                  useStore.getState().setSettingsOpen(true)
                }}
              >
                {t('imageStudio.ocrProBtn') || 'Kích hoạt mã bản quyền trong Cài đặt'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* License Status Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 8,
                background: isPremium
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.16), rgba(99, 102, 241, 0.12))'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(217, 119, 6, 0.08))',
                border: isPremium
                  ? '1px solid rgba(168, 85, 247, 0.35)'
                  : '1px solid rgba(245, 158, 11, 0.28)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CrownIcon width={13} height={13} fill={isPremium ? '#c084fc' : '#f59e0b'} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: isPremium ? '#c084fc' : '#f59e0b' }}>
                    {isPremium
                      ? (t('imageStudio.premiumActive') || 'Gói PREMIUM (60 ngày)')
                      : (t('imageStudio.vipActive') || 'Gói VIP (30 ngày)')}
                  </span>
                </div>
                {!isPremium ? (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c084fc',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                    onClick={() => {
                      playButtonClickSound()
                      useStore.getState().setSettingsOpen(true)
                    }}
                  >
                    Nâng cấp PREMIUM
                  </button>
                ) : (
                  <span style={{ fontSize: 9.5, color: '#e9d5ff', background: 'rgba(168, 85, 247, 0.25)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                    Auto-OCR & Xuất File
                  </span>
                )}
              </div>

              {/* Language Selection */}
              <div className="image-studio-row">
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  {t('imageStudio.ocrLangLabel') || 'Ngôn ngữ nhận diện:'}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { id: 'vie+eng' as const, label: 'Việt + Anh' },
                    { id: 'eng' as const, label: 'English' },
                    { id: 'vie' as const, label: 'Tiếng Việt' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`image-tool-btn${ocrLang === item.id ? ' active' : ''}`}
                      onClick={() => { setOcrLang(item.id); playButtonClickSound() }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-OCR Toggle (PREMIUM Exclusive) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)' }}>
                    {t('imageStudio.autoOcr') || 'Tự động trích chữ khi mở ảnh'}
                  </span>
                  <span style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: isPremium ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff'
                  }}>
                    PREMIUM
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isPremium && autoOcr}
                  onChange={handleToggleAutoOcr}
                  style={{ cursor: 'pointer', accentColor: '#a855f7' }}
                />
              </div>

              {!ocrResult && !ocrRunning && (
                <button
                  type="button"
                  className="image-studio-btn primary"
                  style={{ width: '100%', justifyContent: 'center', height: 32 }}
                  onClick={handleStartOcr}
                >
                  <OcrIcon width={14} height={14} />
                  <span>{t('imageStudio.ocrStartBtn') || 'Bắt đầu trích xuất chữ'}</span>
                </button>
              )}

              {ocrRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    <span>{ocrStatus || (t('imageStudio.ocrExtracting') || 'Đang nhận diện chữ...')}</span>
                    <strong style={{ color: '#38bdf8' }}>{ocrProgress}%</strong>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(5, ocrProgress))}%`,
                        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                        transition: 'width 0.2s ease'
                      }}
                    />
                  </div>
                </div>
              )}

              {ocrResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>
                      {ocrResult.linesCount} dòng · {ocrResult.wordsCount} từ · ~{ocrResult.confidence}% tin cậy
                    </span>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={handleStartOcr}
                    >
                      {t('imageStudio.ocrRefresh') || 'Quét lại'}
                    </button>
                  </div>

                  <textarea
                    readOnly
                    value={ocrResult.text || (t('imageStudio.ocrNotFound') || '(Không phát hiện thấy văn bản rõ ràng)')}
                    rows={4}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: 8,
                      color: 'rgba(255, 255, 255, 0.95)',
                      fontSize: 12,
                      fontFamily: 'var(--font-ui)',
                      lineHeight: 1.45,
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* PREMIUM Tools row: Unwrap & Markdown & Save TXT */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="image-tool-btn"
                      onClick={handleUnwrapLines}
                      disabled={!ocrResult.text}
                      style={{
                        flex: 1,
                        fontSize: 10.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span>{t('imageStudio.ocrUnwrap') || 'Bỏ ngắt dòng'}</span>
                      <span style={{ fontSize: 8, background: isPremium ? '#a855f7' : 'rgba(255,255,255,0.15)', color: '#fff', padding: '0 3px', borderRadius: 3, fontWeight: 700 }}>PRO+</span>
                    </button>
                    <button
                      type="button"
                      className="image-tool-btn"
                      onClick={handleCopyMarkdown}
                      disabled={!ocrResult.text}
                      style={{
                        flex: 1,
                        fontSize: 10.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span>{ocrCopiedMarkdown ? (t('imageStudio.ocrCopiedMarkdown') || 'Đã chép MD!') : (t('imageStudio.ocrCopyMarkdown') || 'Chép Markdown')}</span>
                      <span style={{ fontSize: 8, background: isPremium ? '#a855f7' : 'rgba(255,255,255,0.15)', color: '#fff', padding: '0 3px', borderRadius: 3, fontWeight: 700 }}>PRO+</span>
                    </button>
                    <button
                      type="button"
                      className="image-tool-btn"
                      onClick={handleSaveTxtFile}
                      disabled={!ocrResult.text}
                      style={{
                        flex: 1,
                        fontSize: 10.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <span>{ocrSavedTxt ? (t('imageStudio.ocrSavedTxt') || 'Đã lưu!') : (t('imageStudio.ocrSaveTxt') || 'Lưu .TXT')}</span>
                      <span style={{ fontSize: 8, background: isPremium ? '#a855f7' : 'rgba(255,255,255,0.15)', color: '#fff', padding: '0 3px', borderRadius: 3, fontWeight: 700 }}>PRO+</span>
                    </button>
                  </div>

                  <div className="image-studio-actions">
                    <button
                      type="button"
                      className="image-studio-btn primary"
                      onClick={handleCopyOcrText}
                      disabled={!ocrResult.text}
                    >
                      {ocrCopied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
                      {ocrCopied ? (t('imageStudio.ocrCopiedText') || 'Đã sao chép chữ!') : (t('imageStudio.ocrCopyText') || 'Sao chép văn bản')}
                    </button>
                    <button
                      type="button"
                      className="image-studio-btn"
                      onClick={handleAddOcrToHistory}
                      disabled={!ocrResult.text}
                    >
                      {ocrAddedToHistory ? <CheckIcon width={13} height={13} /> : <span>+</span>}
                      {ocrAddedToHistory ? (t('imageStudio.ocrAddedToHistory') || 'Đã thêm vào lịch sử!') : (t('imageStudio.ocrAddToHistory') || 'Thêm vào danh sách')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

