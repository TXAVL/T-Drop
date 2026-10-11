import { useState } from 'react'
import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { formatBytes, formatSpeed } from '../lib/format'
import { playButtonClickSound } from '../lib/soundEffects'
import { motion, AnimatePresence } from 'framer-motion'
import { resolveUpdateMode } from '../../shared/types'

export function UpdateBanner({ isHorizontal = false }: { isHorizontal?: boolean }) {
  const { t } = useTranslation()
  const [isRestarting, setIsRestarting] = useState(false)
  const updateInfo = useStore((s) => s.updateInfo)
  const isStoreBuild = useStore((s) => s.isStoreBuild)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const manualCheckState = useStore((s) => s.manualCheckState)
  const installUpdate = useStore((s) => s.installUpdate)
  const dismissUpdate = useStore((s) => s.dismissUpdate)
  const settings = useStore((s) => s.settings)
  const updateMode = resolveUpdateMode(settings)

  if (isStoreBuild || settingsOpen || !updateInfo?.hasUpdate) return null

  const isDownloaded = !!updateInfo.downloaded
  const isDownloading =
    !isDownloaded &&
    (updateMode === 'auto' ||
      manualCheckState.status === 'downloading' ||
      !!updateInfo.downloadProgress)
  const isNotifyPrompt = !isDownloaded && !isDownloading && updateMode === 'notify'

  if (!isDownloaded && !isDownloading && !isNotifyPrompt) return null

  const version = updateInfo.latestVersion || manualCheckState.version || ''
  const progress = updateInfo.downloadProgress
  const percent = progress?.percent ?? 0
  const transferredStr =
    progress?.transferred && progress.transferred > 0 ? formatBytes(progress.transferred) : ''
  const totalStr = progress?.total && progress.total > 0 ? formatBytes(progress.total) : ''
  const speedStr = formatSpeed(progress?.bytesPerSecond)

  return (
    <AnimatePresence>
      <motion.div
        key="update-banner"
        initial={{ opacity: 0, y: isHorizontal ? 6 : -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: isHorizontal ? 6 : -6, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          margin: isHorizontal ? '6px 14px 2px' : '4px 12px 6px',
          padding: '8px 12px',
          borderRadius: '12px',
          background: isDownloaded
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.22) 100%)'
            : isNotifyPrompt
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.22) 100%)'
              : 'linear-gradient(135deg, rgba(6, 182, 212, 0.14) 0%, rgba(59, 130, 246, 0.18) 100%)',
          border: isDownloaded
            ? '1px solid rgba(52, 211, 153, 0.35)'
            : isNotifyPrompt
              ? '1px solid rgba(139, 92, 246, 0.35)'
              : '1px solid rgba(6, 182, 212, 0.32)',
          boxShadow: isDownloaded
            ? '0 4px 16px rgba(16, 185, 129, 0.2)'
            : isNotifyPrompt
              ? '0 4px 16px rgba(139, 92, 246, 0.2)'
              : '0 4px 16px rgba(6, 182, 212, 0.2)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 80,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
              flex: 1,
              cursor: isDownloaded ? 'default' : 'pointer'
            }}
            onClick={() => {
              if (!isDownloaded && !isNotifyPrompt) {
                playButtonClickSound()
                setSettingsOpen(true)
              }
            }}
          >
            {/* Status Icon */}
            {isDownloaded ? (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#000000',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                  fontWeight: 900,
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
                }}
              >
                ✓
              </span>
            ) : isNotifyPrompt ? (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1.5px solid #8b5cf6',
                  color: '#c4b5fd',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)'
                }}
              >
                ✦
              </span>
            ) : (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.2)',
                  border: '1.5px solid #06b6d4',
                  color: '#22d3ee',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 0 10px rgba(6, 182, 212, 0.4)'
                }}
              >
                ↓
              </span>
            )}

            {/* Label and Status */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '12px',
                  fontWeight: 650,
                  color: '#ffffff'
                }}
              >
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {isDownloaded
                    ? t('behaviour.updateReadyTitle', {
                        version: version ? `v${version}` : ''
                      }) || (version ? `Update v${version} ready` : 'Update ready')
                    : isNotifyPrompt
                      ? (t('behaviour.newUpdateAvailable', {
                          version: version ? `v${version}` : ''
                        }) || (version ? `New update available v${version}` : 'New update available'))
                      : percent > 0
                        ? `${t('behaviour.downloadingUpdate') || 'Downloading update'} ${version ? `v${version}` : ''}: ${percent}%`
                        : t('behaviour.connectingDownload') || 'Connecting to download server...'}
                </span>
              </div>
              {isNotifyPrompt ? (
                <div style={{ fontSize: '10.5px', color: '#c4b5fd' }}>
                  {t('behaviour.notifyModeSubtitle') || 'Notification mode · Click to download'}
                </div>
              ) : !isDownloaded && transferredStr && totalStr ? (
                <div
                  style={{
                    fontSize: '10.5px',
                    color: '#a5f3fc',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center'
                  }}
                >
                  <span>
                    {transferredStr} / {totalStr}
                  </span>
                  {speedStr && <span style={{ color: '#6ee7b7' }}>· ↓ {speedStr}</span>}
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isDownloaded ? (
              <button
                type="button"
                disabled={isRestarting}
                onClick={() => {
                  setIsRestarting(true)
                  playButtonClickSound()
                  void installUpdate()
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: '#10b981',
                  color: '#000000',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isRestarting ? 'default' : 'pointer',
                  opacity: isRestarting ? 0.8 : 1,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.15s ease, filter 0.15s ease'
                }}
                onMouseOver={(e) => {
                  if (!isRestarting) e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = 'none'
                }}
              >
                {isRestarting
                  ? t('behaviour.restarting') || 'Restarting...'
                  : t('behaviour.restartToUpdate') || 'Restart to Update'}
              </button>
            ) : isNotifyPrompt ? (
              <button
                type="button"
                onClick={() => {
                  playButtonClickSound()
                  void useStore.getState().startManualDownload()
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.15s ease, filter 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = 'none'
                }}
              >
                {t('behaviour.download') || 'Download'}
              </button>
            ) : null}

            {/* Dismiss X button */}
            <button
              type="button"
              onClick={() => {
                playButtonClickSound()
                dismissUpdate()
              }}
              title={t('common.dismiss') || 'Dismiss'}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
                border: 'none',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: '12px',
                lineHeight: 1,
                padding: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Bar Line when actively downloading */}
        {isDownloading && (
          <div
            style={{
              width: '100%',
              height: 3,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.12)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.max(4, percent)}%`,
                background:
                  'linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
                boxShadow: '0 0 8px rgba(6, 182, 212, 0.8)',
                transition: 'width 0.25s ease'
              }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
