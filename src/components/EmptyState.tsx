import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { ClipboardIcon, SparklesIcon } from './icons'

export function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation()
  const typeFilter = useStore((s) => s.typeFilter)
  const settings = useStore((s) => s.settings)

  let title = filtered ? t('emptyState.noResultsFound') : t('emptyState.shelfEmpty')
  let hint = filtered ? t('emptyState.noResultsHint') : t('emptyState.shelfEmptyHint')

  if (typeFilter !== 'all') {
    if (typeFilter === 'pinned') {
      title = t('emptyState.noPinnedTitle')
      hint = t('emptyState.noPinnedHint')
    } else {
      const labelKey =
        typeFilter === 'text'
          ? 'emptyState.textClips'
          : typeFilter === 'links'
            ? 'emptyState.links'
            : typeFilter === 'images'
              ? 'emptyState.images'
              : typeFilter === 'colors'
                ? 'filters.colors'
                : 'emptyState.files'
      const label = (t(labelKey) || 'colors').toLowerCase()
      title = t('emptyState.noClipsFound', { type: label })
      hint = t('emptyState.copyTypeHint', { type: label })
    }
  }

  const toggleKey = (settings?.toggleHotkey || 'Alt+C').replace(/\+/g, ' + ')

  return (
    <div className="empty">
      <div className="empty-icon-wrap">
        {filtered ? <SparklesIcon width={24} height={24} /> : <ClipboardIcon width={24} height={24} />}
      </div>
      <div className="empty-text">
        <div className="big">{title}</div>
        <div className="hint">{hint}</div>
      </div>
      {!filtered && (
        <dl className="empty-keys">
          <div className="empty-key-row">
            <dt>{t('emptyState.copy')}</dt>
            <dd><kbd>Ctrl + C</kbd></dd>
          </div>
          <div className="empty-key-row">
            <dt>{t('emptyState.search')}</dt>
            <dd><kbd>/</kbd></dd>
          </div>
          <div className="empty-key-row">
            <dt>{t('emptyState.toggle')}</dt>
            <dd><kbd>{toggleKey}</kbd></dd>
          </div>
        </dl>
      )}
    </div>
  )
}
