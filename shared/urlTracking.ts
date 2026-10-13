/**
 * URL Tracking Parameter Engine.
 * Strips tracking query parameters from major platforms (Google, Meta, YouTube,
 * Twitter/X, TikTok, Shopee, Amazon, etc.) while strictly preserving functional parameters.
 */

export const TRACKING_PARAM_PREFIXES = ['utm_', 'ga_', 'mc_', 'hs_', 'aff_', 'pd_rd_', 'pf_rd_']

export const TRACKING_PARAMS = new Set([
  // Google / GA
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_reader', 'utm_referrer',
  'gclid', 'dclid', 'gbraid', 'wbraid', '_ga', '_gl', 'sxsrf', 'ved', 'usqp',
  // Facebook / Instagram / Meta
  'fbclid', 'igshid', 'fref',
  // Microsoft / Bing
  'msclkid', 'ocid',
  // Twitter / X
  'twclid', 'ref_src', 'ref_url', '__twitter_impression',
  // YouTube (si = share identifier, pp = player param, feature = share feature)
  'si', 'pp', 'feature',
  // TikTok
  '_r', 'checksum', 'tt_from',
  // E-commerce (Shopee, Lazada, AliExpress, Amazon, eBay)
  'sp_atk', 'xptdk', 'aff_trace_key', 'scm', 'pvid', 'tag', 'psc', 'mkevt', 'mkcid',
  // Generic / Email
  'ref', 'source', 'trk', '_hsenc', '_hsmi', 'mc_cid', 'mc_eid', 'yclid', 'zanpid', 'sc_cid',
  'mkt_tok', 'spReportId', 'vero_id', 'vero_conv'
])

/** Returns true if a query parameter key is a known tracking token */
export function isTrackingParam(key: string, host = ''): boolean {
  const k = key.toLowerCase()
  if (TRACKING_PARAM_PREFIXES.some((p) => k.startsWith(p))) return true
  if (TRACKING_PARAMS.has(k)) return true

  const h = host.toLowerCase()
  // Twitter / X tracking
  if ((h.includes('twitter.com') || h.includes('x.com')) && (k === 's' || k === 't')) {
    return true
  }
  // TikTok share params
  if (h.includes('tiktok.com') && (k === 't' || k === '_t')) {
    return true
  }
  return false
}

/** Strips all tracking tokens from a URL string while preserving essential query parameters */
export function cleanTrackingUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim()
    const urlObj = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    const host = urlObj.hostname.toLowerCase()
    const cleanParams = new URLSearchParams()
    urlObj.searchParams.forEach((val, key) => {
      if (!isTrackingParam(key, host)) {
        cleanParams.append(key, val)
      }
    })
    const searchStr = cleanParams.toString()
    const cleanSearch = searchStr ? `?${searchStr}` : ''
    const cleanHash = urlObj.hash || ''
    const protocol = trimmed.startsWith('http://') ? 'http:' : 'https:'
    return `${protocol}//${urlObj.host}${urlObj.pathname}${cleanSearch}${cleanHash}`
  } catch {
    return rawUrl
  }
}

/** Returns true if the URL has one or more tracking query parameters */
export function hasTrackingParams(rawUrl: string): boolean {
  try {
    const trimmed = rawUrl.trim()
    const urlObj = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    const host = urlObj.hostname.toLowerCase()
    for (const [key] of urlObj.searchParams) {
      if (isTrackingParam(key, host)) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}
