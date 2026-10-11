import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'

export function RestoreModal() {
  const restoreModal = useStore((s) => s.restoreModal)
  const setRestoreModal = useStore((s) => s.setRestoreModal)
  const pushToast = useStore((s) => s.pushToast)
  const { t } = useTranslation()
  const [selectedMode, setSelectedMode] = useState<'merge' | 'overwrite'>('merge')
  const [isRestoring, setIsRestoring] = useState(false)

  if (!restoreModal || !restoreModal.open) return null

  const fileName = restoreModal.filePath.split(/[/\\]/).pop() || restoreModal.filePath
  const itemsCount = restoreModal.manifest?.itemsCount ?? 0
  const createdAt = restoreModal.manifest?.createdAt
    ? new Date(restoreModal.manifest.createdAt).toLocaleString()
    : undefined

  const handleClose = () => {
    if (isRestoring) return
    playButtonClickSound()
    setRestoreModal(null)
  }

  const handleConfirm = async () => {
    if (isRestoring) return
    setIsRestoring(true)
    playButtonClickSound()

    try {
      const res = await window.edge.restoreBackup(restoreModal.filePath, selectedMode)
      if (res.ok) {
        pushToast({
          id: Date.now().toString(),
          message: t('backup.importSuccess', { count: res.restoredItemsCount ?? itemsCount }) || `Đã khôi phục thành công ${res.restoredItemsCount ?? itemsCount} mục!`,
          tone: 'info'
        })
        setRestoreModal(null)
      } else {
        pushToast({
          id: Date.now().toString(),
          message: t('backup.importFailed', { error: res.error || 'Lỗi khôi phục' }) || `Lỗi khôi phục: ${res.error}`,
          tone: 'error'
        })
      }
    } catch (err) {
      pushToast({
        id: Date.now().toString(),
        message: t('backup.importFailed', { error: String(err) }) || `Lỗi khôi phục: ${String(err)}`,
        tone: 'error'
      })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="txa-modal-overlay" onClick={handleClose}>
        <motion.div
          className="txa-modal-card"
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="txa-modal-header">
            <div className="txa-modal-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#00d2ff' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>
                {restoreModal.autoDetected
                  ? (t('backup.autoDetectedTitle') || 'Phát hiện bản sao lưu T-Drop (.txa)')
                  : (t('backup.previewTitle') || 'Khôi phục bản sao lưu (.txa)')}
              </span>
            </div>
            <button
              type="button"
              className="txa-modal-close"
              disabled={isRestoring}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className="txa-modal-info">
            <div className="txa-info-row">
              <span className="txa-info-label">{t('backup.file') || 'Tệp sao lưu:'}</span>
              <span className="txa-info-val" title={restoreModal.filePath}>
                {fileName}
              </span>
            </div>
            <div className="txa-info-row">
              <span className="txa-info-label">{t('backup.items') || 'Số lượng mục:'}</span>
              <span className="txa-info-val highlight">
                {itemsCount} {t('backup.itemsUnit') || 'mục'}
              </span>
            </div>
            {createdAt && (
              <div className="txa-info-row">
                <span className="txa-info-label">{t('backup.createdAt') || 'Ngày tạo:'}</span>
                <span className="txa-info-val">{createdAt}</span>
              </div>
            )}
          </div>

          <div className="txa-mode-selector">
            <div
              className={`txa-mode-btn ${selectedMode === 'merge' ? 'active' : ''}`}
              onClick={() => {
                if (isRestoring) return
                playButtonClickSound()
                setSelectedMode('merge')
              }}
            >
              <div className="txa-mode-btn-title">
                {t('backup.modeMerge') || 'Gộp dữ liệu (Khuyên dùng)'}
              </div>
              <div className="txa-mode-btn-desc">
                {t('backup.modeMergeDesc') || 'Giữ nguyên mục hiện tại và thêm các mục mới từ bản sao lưu.'}
              </div>
            </div>

            <div
              className={`txa-mode-btn ${selectedMode === 'overwrite' ? 'active' : ''}`}
              onClick={() => {
                if (isRestoring) return
                playButtonClickSound()
                setSelectedMode('overwrite')
              }}
            >
              <div className="txa-mode-btn-title">
                {t('backup.modeOverwrite') || 'Ghi đè toàn bộ'}
              </div>
              <div className="txa-mode-btn-desc">
                {t('backup.modeOverwriteDesc') || 'Xóa toàn bộ dữ liệu hiện tại và thay thế bằng bản sao lưu.'}
              </div>
            </div>
          </div>

          <div className="txa-modal-actions">
            <button
              type="button"
              className="txa-btn txa-btn-secondary"
              disabled={isRestoring}
              onClick={handleClose}
            >
              {t('backup.cancel') || 'Bỏ qua'}
            </button>
            <button
              type="button"
              className="txa-btn txa-btn-primary"
              disabled={isRestoring}
              onClick={handleConfirm}
            >
              {isRestoring
                ? (t('backup.restoring') || 'Đang khôi phục...')
                : (t('backup.confirmRestore') || 'Khôi phục ngay')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
