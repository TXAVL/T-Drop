import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { ClipboardIcon, SparklesIcon } from './icons'

export function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation()
  const typeFilter = useStore((s) => s.typeFilter)

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

  return (
    <div className="empty">
      <div className="empty-icon-wrap" style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(56, 189, 248, 0.12))',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a78bfa',
        marginBottom: 14,
        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)'
      }}>
        {filtered ? <SparklesIcon width={24} height={24} /> : <ClipboardIcon width={24} height={24} />}
      </div>
      <div className="empty-text">
        <div className="big" style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{title}</div>
        <div className="hint" style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.45 }}>{hint}</div>
      </div>
      {!filtered && (
        <div style={{
          marginTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          width: '100%',
          maxWidth: 220
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
            <span>{t('emptyState.copy')}</span>
            <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Ctrl + C</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
            <span>{t('emptyState.search')}</span>
            <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>/</kbd>
          </div>
        </div>
      )}
    </div>
  )
}
