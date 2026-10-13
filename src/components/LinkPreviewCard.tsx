import React, { useMemo } from 'react'
import { parseUrlPreview, type UrlPreviewInfo } from '../lib/urlPreview'
import { LinkIcon } from './icons'

interface LinkPreviewCardProps {
  url: string
  compact?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  url,
  compact = false,
  onClick
}) => {
  const info: UrlPreviewInfo = useMemo(() => parseUrlPreview(url), [url])

  // Clean, professional display:
  // Top: Link SVG + Domain (e.g. 🔗 github.com)
  const domain = info.domain || 'link'

  // Clean URL without protocol (e.g. linkedin.com/in/gaurav-jha-hr)
  const displayUrl = info.cleanUrl.replace(/^https?:\/\//, '')

  // Main: Clean, human-readable title if distinct from domain and URL
  const rawTitle = info.title?.trim()
  const hasDistinctTitle = Boolean(
    rawTitle &&
    rawTitle.toLowerCase() !== displayUrl.toLowerCase() &&
    rawTitle.toLowerCase() !== domain.toLowerCase()
  )
  const displayTitle = hasDistinctTitle ? rawTitle : displayUrl

  return (
    <div
      className={`link-card${compact ? ' compact' : ''}`}
      onClick={onClick}
    >
      <div className="link-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
          <LinkIcon width={12} height={12} className="link-card-icon" />
          <span className="link-card-domain">{domain}</span>
        </div>
      </div>

      <div className="link-card-body" title={info.cleanUrl}>
        {displayTitle}
      </div>

      {hasDistinctTitle && (
        <div className="link-card-url" title={info.cleanUrl}>
          {displayUrl}
        </div>
      )}
    </div>
  )
}

export default LinkPreviewCard
