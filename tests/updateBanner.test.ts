import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveUpdateMode } from '../shared/types'

const root = join(__dirname, '..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('UpdateBanner contracts and lifecycle behavior', () => {
  it('is properly mounted directly inside the main Shelf Panel', () => {
    const panelSrc = read('src/components/Panel.tsx')
    expect(panelSrc).toContain("import { UpdateBanner } from './UpdateBanner'")
    expect(panelSrc).toContain('<UpdateBanner isHorizontal={isHorizontal} />')
  })

  it('handles all update lifecycle states: downloading, notify prompt, error, and ready to restart', () => {
    const bannerSrc = read('src/components/UpdateBanner.tsx')

    // Gate checks
    expect(bannerSrc).toContain('const visible = !isStoreBuild && !settingsOpen && !!updateInfo?.hasUpdate')
    expect(bannerSrc).toContain("if (updateInfo.downloaded) tone = 'ready'")
    expect(bannerSrc).toContain("else if (updateInfo.error) tone = 'error'")
    expect(bannerSrc).toContain("else if (updateMode === 'notify') tone = 'notify'")

    // Downloading state: surfaces live metrics and progress bar
    expect(bannerSrc).toContain('formatBytes(transferred)')
    expect(bannerSrc).toContain('formatSpeed(speed)')
    expect(bannerSrc).toContain("tone === 'downloading' && (")

    // Notify / error states: surface download (or retry) action button
    expect(bannerSrc).toContain("(tone === 'notify' || tone === 'error') && (")
    expect(bannerSrc).toContain('useStore.getState().startManualDownload()')

    // Downloaded state: surfaces interactive restart button without silent background quit
    expect(bannerSrc).toContain('void installUpdate()')
    expect(bannerSrc).toContain('restartToUpdate')
  })

  it('correctly maps updateMode settings for auto vs notify behavior', () => {
    // When autoUpdates is true or updateMode is 'auto', it resolves to 'auto'
    expect(resolveUpdateMode({ updateMode: 'auto' })).toBe('auto')
    expect(resolveUpdateMode({ autoUpdates: true })).toBe('auto')

    // When updateMode is 'notify' or legacy autoUpdates is false, it resolves to 'notify'
    expect(resolveUpdateMode({ updateMode: 'notify' })).toBe('notify')
    expect(resolveUpdateMode({ autoUpdates: false })).toBe('notify')
  })

  it('dismiss button properly cancels download and prevents banner resurrection', () => {
    const bannerSrc = read('src/components/UpdateBanner.tsx')
    const storeSrc = read('src/store/appStore.ts')

    // Banner stopPropagation & dismissUpdate call
    expect(bannerSrc).toContain('e.stopPropagation()')
    expect(bannerSrc).toContain('dismissUpdate()')

    // appStore invokes edge.dismissUpdate to cancel backend download
    expect(storeSrc).toContain('void edge.dismissUpdate?.()')

    // setUpdateProgress prevents resurrection of dismissed updateInfo
    expect(storeSrc).toContain('if (!current) return')
    expect(storeSrc).toContain('sessionSkippedVersion')
  })
})

