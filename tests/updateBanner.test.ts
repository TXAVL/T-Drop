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

  it('handles all 3 update lifecycle states: downloading, notify prompt, and ready to restart', () => {
    const bannerSrc = read('src/components/UpdateBanner.tsx')

    // Gate checks
    expect(bannerSrc).toContain('if (isStoreBuild || settingsOpen || !updateInfo?.hasUpdate) return null')
    expect(bannerSrc).toContain('const isDownloaded = !!updateInfo.downloaded')
    expect(bannerSrc).toContain('const isDownloading =')
    expect(bannerSrc).toContain('const isNotifyPrompt = !isDownloaded && !isDownloading && updateMode === \'notify\'')

    // Downloading state: surfaces live metrics and progress bar
    expect(bannerSrc).toContain('formatBytes(progress.transferred)')
    expect(bannerSrc).toContain('formatSpeed(progress?.bytesPerSecond)')
    expect(bannerSrc).toContain('isDownloading && (')

    // Notify state: surfaces download action button
    expect(bannerSrc).toContain('isNotifyPrompt ? (')
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
})
