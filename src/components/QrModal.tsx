import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import { QrCodeIcon, CopyIcon, CheckIcon, CloseIcon } from './icons'

export function QrModal() {
  const qrModal = useStore((s) => s.qrModal)
  const setQrModal = useStore((s) => s.setQrModal)
  const pushToast = useStore((s) => s.pushToast)
  const { t } = useTranslation()

  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!qrModal?.text) {
      setQrUrl(null)
      return
    }

    let active = true
    QRCode.toDataURL(qrModal.text, {
      width: 380,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (active) setQrUrl(url)
      })
      .catch((err) => {
        console.error('[QR] Failed to generate QR code', err)
      })

    return () => {
      active = false
    }
  }, [qrModal?.text])

  if (!qrModal) return null

  const handleClose = () => {
    playButtonClickSound()
    setQrModal(null)
  }

  const handleCopyImage = async () => {
    if (!qrUrl) return
    playButtonClickSound()
    try {
      const res = await fetch(qrUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      setCopied(true)
      pushToast({
        id: Date.now().toString(),
        message: t('qr.imageCopied') || 'Đã sao chép ảnh mã QR vào clipboard!',
        tone: 'info'
      })
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('[QR] Copy failed', e)
    }
  }

  const handleDownload = () => {
    if (!qrUrl) return
    playButtonClickSound()
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `tdrop-qr-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    pushToast({
      id: Date.now().toString(),
      message: t('qr.downloadSuccess') || 'Đã lưu ảnh mã QR (.PNG)!',
      tone: 'info'
    })
  }

  const previewSnippet = qrModal.title || (
    qrModal.text.length > 60
      ? qrModal.text.slice(0, 57) + '...'
      : qrModal.text
  )

  return (
    <AnimatePresence>
      <div className="txa-modal-overlay" onClick={handleClose}>
        <motion.div
          className="txa-modal-card"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 360, alignItems: 'center' }}
        >
          {/* Header */}
          <div className="txa-modal-header" style={{ width: '100%' }}>
            <div className="txa-modal-title-group">
              <div className="txa-modal-icon-badge" style={{ background: 'rgba(0, 210, 255, 0.15)', color: '#00d2ff' }}>
                <QrCodeIcon width={18} height={18} />
              </div>
              <div className="txa-modal-title-text" style={{ minWidth: 0 }}>
                <div className="txa-modal-title">
                  {t('qr.title') || 'Chia sẻ mã QR'}
                </div>
                <div
                  className="txa-modal-subtitle"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 220
                  }}
                  title={qrModal.text}
                >
                  {previewSnippet}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="txa-modal-close"
              onClick={handleClose}
              title={t('header.close') || 'Đóng'}
            >
              <CloseIcon width={14} height={14} />
            </button>
          </div>

          {/* QR Display Card */}
          <div
            style={{
              background: '#ffffff',
              padding: 12,
              borderRadius: 16,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(0, 210, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 210,
              minHeight: 210,
              margin: '6px 0'
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code"
                width={200}
                height={200}
                style={{ display: 'block', borderRadius: 8, userSelect: 'none' }}
                draggable={false}
              />
            ) : (
              <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>
                {t('common.loading') || 'Đang tạo...'}
              </div>
            )}
          </div>

          {/* Prompt Tip */}
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.72)',
              textAlign: 'center',
              lineHeight: 1.45,
              padding: '0 8px'
            }}
          >
            {t('qr.scanTip') || 'Mở camera trên điện thoại (iOS / Android) để quét và nhận nội dung tức thì không cần dây cáp.'}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              width: '100%',
              marginTop: 6
            }}
          >
            <button
              type="button"
              onClick={handleCopyImage}
              style={{
                flex: 1,
                height: 36,
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: copied ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: copied ? '#34d399' : '#ffffff',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!copied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
              onMouseLeave={(e) => {
                if (!copied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
            >
              {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
              <span>{copied ? (t('item.copied') || 'Đã sao chép') : (t('qr.copyImage') || 'Chép ảnh')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              style={{
                flex: 1,
                height: 36,
                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.2), rgba(157, 78, 221, 0.2))',
                border: '1px solid rgba(0, 210, 255, 0.35)',
                color: '#ffffff',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid rgba(0, 210, 255, 0.6)'
                e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 210, 255, 0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid rgba(0, 210, 255, 0.35)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{t('qr.download') || 'Tải ảnh PNG'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
