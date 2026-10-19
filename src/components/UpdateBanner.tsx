import { useState } from 'react'
import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { formatBytes, formatSpeed } from '../lib/format'
import { playButtonClickSound } from '../lib/soundEffects'
import { motion, AnimatePresence } from 'framer-motion'
import { resolveUpdateMode } from '../../shared/types'

type BannerTone = 'ready' | 'notify' | 'downloading' | 'error'

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s ? `${m}m ${s}s` : `${m}m`
}

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
  const updateMode = useStore((s) => resolveUpdateMode(s.settings))
  const reduceMotion = useStore((s) => !!s.settings.reduceMotion)

  const visible = !isStoreBuild && !settingsOpen && !!updateInfo?.hasUpdate

  let tone: BannerTone | null = null
  if (visible && updateInfo) {
    if (updateInfo.downloaded) tone = 'ready'
    else if (updateInfo.error) tone = 'error'
    else if (
      updateMode === 'auto' ||
      manualCheckState.status === 'downloading' ||
      !!updateInfo.downloadProgress
    )
      tone = 'downloading'
    else if (updateMode === 'notify') tone = 'notify'
  }

  const version = updateInfo?.latestVersion || manualCheckState.version || ''
  const vLabel = version ? `v${version}` : ''
  const progress = updateInfo?.downloadProgress
  const percent = progress?.percent ?? 0
  const transferred = progress?.transferred ?? 0
  const total = progress?.total ?? 0
  const speed = progress?.bytesPerSecond ?? 0
  const eta = speed > 0 && total > transferred ? formatEta((total - transferred) / speed) : ''

  let title = ''
  let subtitle: React.ReactNode = null
  switch (tone) {
    case 'ready':
      title = t('behaviour.updateReadyTitle', { version: vLabel }) || `Update ${vLabel} ready`
      break
    case 'notify':
      title = t('behaviour.newUpdateAvailable', { version: vLabel }) || `New update available ${vLabel}`
      subtitle = t('behaviour.notifyModeSubtitle') || 'Notification mode · Click to download'
      break
    case 'error':
      title =
        updateInfo?.error?.phase === 'install'
          ? t('behaviour.updateInstallFailed')
          : t('behaviour.updateDownloadFailed')
      subtitle = updateInfo?.error?.message
      break
    case 'downloading':
      title =
        percent > 0
          ? `${t('behaviour.downloadingUpdate') || 'Downloading update'} ${vLabel}`
          : t('behaviour.connectingDownload') || 'Connecting to download server...'
      if (transferred > 0 && total > 0) {
        subtitle = (
          <>
            <span>
              {formatBytes(transferred)} / {formatBytes(total)}
            </span>
            {speed > 0 && <span className="update-banner__speed">↓ {formatSpeed(speed)}</span>}
            {eta && <span>{t('behaviour.updateEta', { eta })}</span>}
          </>
        )
      }
      break
  }

  const openNotes = () => {
    if (!updateInfo?.notesUrl) return
    playButtonClickSound()
    window.open(updateInfo.notesUrl, '_blank')
  }

  return (
    <AnimatePresence initial={false}>
      {tone && (
        <motion.div
          key="update-banner"
          className={`update-banner update-banner--${tone}${isHorizontal ? ' is-horizontal' : ''}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: isHorizontal ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: isHorizontal ? 6 : -6 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
        >
          <div className="update-banner__row">
            <button
              type="button"
              className="update-banner__main"
              disabled={tone !== 'downloading'}
              onClick={() => {
                playButtonClickSound()
                setSettingsOpen(true)
              }}
            >
              <span className="update-banner__icon" aria-hidden>
                {tone === 'ready' ? '✓' : tone === 'notify' ? '✦' : tone === 'error' ? '!' : '↓'}
              </span>
              <span className="update-banner__text">
                <span className="update-banner__title">
                  {title}
                  {tone === 'downloading' && percent > 0 && (
                    <span className="update-banner__percent">{percent}%</span>
                  )}
                </span>
                {subtitle && <span className="update-banner__sub">{subtitle}</span>}
              </span>
            </button>

            <div className="update-banner__actions">
              {updateInfo?.notesUrl && tone !== 'downloading' && (
                <button type="button" className="update-banner__link" onClick={openNotes}>
                  {t('behaviour.whatsNew')}
                </button>
              )}
              {tone === 'ready' && (
                <button
                  type="button"
                  className="update-banner__cta"
                  disabled={isRestarting}
                  onClick={() => {
                    setIsRestarting(true)
                    playButtonClickSound()
                    void installUpdate()
                    // If the installer never takes over, let the user try again.
                    window.setTimeout(() => setIsRestarting(false), 8000)
                  }}
                >
                  {isRestarting
                    ? t('behaviour.restarting') || 'Restarting...'
                    : t('behaviour.restartToUpdate') || 'Restart to Update'}
                </button>
              )}
              {(tone === 'notify' || tone === 'error') && (
                <button
                  type="button"
                  className="update-banner__cta"
                  onClick={() => {
                    playButtonClickSound()
                    void useStore.getState().startManualDownload()
                  }}
                >
                  {tone === 'error' ? t('behaviour.retry') : t('behaviour.download') || 'Download'}
                </button>
              )}
              <button
                type="button"
                className="update-banner__close"
                onClick={(e) => {
                  e.stopPropagation()
                  playButtonClickSound()
                  dismissUpdate()
                }}
                title={t('common.dismiss') || 'Dismiss'}
                aria-label={t('common.dismiss') || 'Dismiss'}
              >
                ✕
              </button>
            </div>
          </div>

          {tone === 'downloading' && (
            <div
              className={`update-banner__track${percent === 0 ? ' is-indeterminate' : ''}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className="update-banner__fill" style={{ transform: `scaleX(${Math.max(0.04, percent / 100)})` }} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
