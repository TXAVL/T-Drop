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
          message:
            t('backup.importSuccess', { count: res.restoredItemsCount ?? itemsCount }) ||
            `Successfully restored ${res.restoredItemsCount ?? itemsCount} items into clipboard history!`,
          tone: 'info'
        })
        setRestoreModal(null)
      } else {
        pushToast({
          id: Date.now().toString(),
          message:
            t('backup.importFailed', { error: res.error || 'Restore error' }) ||
            `Failed to restore backup: ${res.error}`,
          tone: 'error'
        })
      }
    } catch (err) {
      pushToast({
        id: Date.now().toString(),
        message:
          t('backup.importFailed', { error: String(err) }) ||
          `Failed to restore backup: ${String(err)}`,
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
          className="txa-modal-card txa-restore-card"
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="txa-modal-header">
            <div className="txa-modal-title-group">
              <div className="txa-modal-icon-badge">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="txa-modal-title-text">
                <div className="txa-modal-title">
                  {restoreModal.autoDetected
                    ? t('backup.autoDetectedTitle') || 'Backup Archive Detected'
                    : t('backup.previewTitle') || 'Restore Preview'}
                </div>
                <div className="txa-modal-subtitle">
                  T-Drop Encrypted Vault (.txa)
                </div>
              </div>
            </div>
            <button
              type="button"
              className="txa-modal-close"
              disabled={isRestoring}
              onClick={handleClose}
              title={t('common.close') || t('header.close') || 'Close'}
            >
              ✕
            </button>
          </div>

          {/* Meta Info Card */}
          <div className="txa-meta-card">
            <div className="txa-meta-row">
              <span className="txa-meta-label">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {t('backup.fileLabel') || 'Backup File:'}
              </span>
              <span className="txa-meta-value txa-meta-filename" title={restoreModal.filePath}>
                {fileName}
              </span>
            </div>

            <div className="txa-meta-row">
              <span className="txa-meta-label">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                {t('backup.itemsLabel') || 'Items:'}
              </span>
              <span className="txa-meta-value txa-meta-count-pill">
                {itemsCount} {t('backup.itemsUnit') || 'items'}
              </span>
            </div>

            {createdAt && (
              <div className="txa-meta-row">
                <span className="txa-meta-label">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t('backup.dateLabel') || 'Created:'}
                </span>
                <span className="txa-meta-value txa-meta-date">{createdAt}</span>
              </div>
            )}

            <div className="txa-meta-row txa-security-row">
              <span className="txa-meta-label">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {t('backup.securityLabel') || 'Security:'}
              </span>
              <span className="txa-security-badge">
                AES-256-GCM + DPAPI
              </span>
            </div>
          </div>

          {/* Zero items notice if applicable */}
          {itemsCount === 0 && (
            <div className="txa-warning-box">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{t('backup.zeroItemsWarning') || 'This backup archive contains 0 data items.'}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="txa-mode-selector">
            <div
              className={`txa-mode-btn ${selectedMode === 'merge' ? 'active' : ''}`}
              onClick={() => {
                if (isRestoring) return
                playButtonClickSound()
                setSelectedMode('merge')
              }}
            >
              <div className="txa-mode-radio">
                <span className="txa-radio-circle" />
              </div>
              <div className="txa-mode-content">
                <div className="txa-mode-btn-title">
                  🔄 {t('backup.modeMerge') || 'Merge (Recommended)'}
                </div>
                <div className="txa-mode-btn-desc">
                  {t('backup.modeMergeDesc') ||
                    'Keep current items and add non-duplicate items from the backup.'}
                </div>
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
              <div className="txa-mode-radio">
                <span className="txa-radio-circle" />
              </div>
              <div className="txa-mode-content">
                <div className="txa-mode-btn-title">
                  ⚡ {t('backup.modeOverwrite') || 'Overwrite All'}
                </div>
                <div className="txa-mode-btn-desc">
                  {t('backup.modeOverwriteDesc') ||
                    'Completely replace current history and settings with the backup.'}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="txa-modal-actions">
            <button
              type="button"
              className="txa-btn txa-btn-secondary"
              disabled={isRestoring}
              onClick={handleClose}
            >
              {t('backup.cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              className="txa-btn txa-btn-primary"
              disabled={isRestoring}
              onClick={handleConfirm}
            >
              {isRestoring ? (
                <>
                  <span className="txa-spinner" />
                  {t('backup.restoring') || 'Restoring...'}
                </>
              ) : (
                t('backup.confirmRestore') || 'Restore Now'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
