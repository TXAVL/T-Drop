import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  version: '0.3.1',
  netRequest: vi.fn(),
  updateAvailable: vi.fn(),
  getSettings: vi.fn(() => ({ autoUpdates: true }))
}))

vi.mock('electron', () => ({
  app: {
    getVersion: () => mocks.version,
    isPackaged: true,
    getAppPath: () => 'C:\\mock\\app',
    getPath: () => 'C:\\mock\\userData'
  },
  net: {
    request: (...args: unknown[]) => mocks.netRequest(...args)
  }
}))

vi.mock('../electron/main/state', () => ({
  pushState: {
    updateAvailable: (...args: unknown[]) => mocks.updateAvailable(...args),
    updateDownloaded: vi.fn(),
    updateProgress: vi.fn()
  }
}))

vi.mock('../electron/store/settings', () => ({
  getSettings: () => mocks.getSettings()
}))

import {
  cancelUpdateDownload,
  checkForUpdatesManual,
  initAutoUpdater,
  quitAndInstallUpdate,
  startUpdateDownload,
  syncAutoUpdaterState
} from '../electron/main/updater'

const INSTALLABLE_ASSETS = [{ name: 'latest.yml' }, { name: 'T-Drop-Setup.exe' }, { name: 'T-Drop-Setup.exe.blockmap' }]

function mockGithubRelease(tag: string, statusCode = 200, assets: { name: string }[] = INSTALLABLE_ASSETS): void {
  mocks.netRequest.mockImplementation(() => {
    const handlers: Record<string, Array<(...a: unknown[]) => void>> = {}
    return {
      setHeader: vi.fn(),
      abort: vi.fn(),
      on: (ev: string, cb: (...a: unknown[]) => void) => {
        (handlers[ev] ??= []).push(cb)
      },
      end: () => {
        const response = {
          statusCode,
          on: (ev: string, cb: (chunk?: string) => void) => {
            if (ev === 'data') cb(JSON.stringify({ tag_name: tag, html_url: `https://github.com/TXAVL/T-Drop/releases/tag/${tag}`, assets }))
            if (ev === 'end') cb()
          }
        }
        for (const cb of handlers.response ?? []) cb(response)
      }
    }
  })
}

describe('auto-updater isolation', () => {
  beforeEach(() => {
    delete process.env.APP_BUILD_TARGET
    mocks.netRequest.mockReset()
    mocks.updateAvailable.mockReset()
    mocks.netRequest.mockImplementation(() => {
      throw new Error('net.request must not run on the Store build')
    })
  })

  afterEach(() => {
    delete process.env.APP_BUILD_TARGET
  })

  describe('Store build', () => {
    beforeEach(() => {
      process.env.APP_BUILD_TARGET = 'store'
    })

    it('checkForUpdatesManual reports up-to-date at the running version and never touches the network', async () => {
      const result = await checkForUpdatesManual()
      expect(result).toEqual({ status: 'up-to-date', version: '0.3.1' })
      expect(mocks.netRequest).not.toHaveBeenCalled()
      expect(mocks.updateAvailable).not.toHaveBeenCalled()
    })

    it('quitAndInstallUpdate / startUpdateDownload / cancelUpdateDownload / sync / init are no-ops', async () => {
      expect(() => quitAndInstallUpdate()).not.toThrow()
      await expect(startUpdateDownload()).resolves.toBeUndefined()
      expect(() => cancelUpdateDownload()).not.toThrow()
      expect(() => syncAutoUpdaterState()).not.toThrow()
      expect(() => initAutoUpdater()).not.toThrow()
      expect(mocks.netRequest).not.toHaveBeenCalled()
    })
  })

  describe('GitHub exe build', () => {
    it('checkForUpdatesManual reports available when GitHub latest is newer', async () => {
      mockGithubRelease('v0.3.2')
      const result = await checkForUpdatesManual()
      expect(result).toEqual({ status: 'available', version: '0.3.2' })
      expect(mocks.netRequest).toHaveBeenCalled()
      expect(mocks.updateAvailable).toHaveBeenCalledWith({
        version: '0.3.2',
        notesUrl: 'https://github.com/TXAVL/T-Drop/releases/tag/v0.3.2'
      })
    })

    it('does not offer a newer tag whose installer assets are not uploaded yet', async () => {
      mockGithubRelease('v0.3.3', 200, [])
      const result = await checkForUpdatesManual()
      expect(result).toEqual({ status: 'up-to-date', version: '0.3.1' })
      expect(mocks.updateAvailable).not.toHaveBeenCalled()
    })

    it('checkForUpdatesManual reports up-to-date when GitHub latest matches', async () => {
      mockGithubRelease('v0.3.1')
      const result = await checkForUpdatesManual()
      expect(result).toEqual({ status: 'up-to-date', version: '0.3.1' })
      expect(mocks.updateAvailable).not.toHaveBeenCalled()
    })

    it('checkForUpdatesManual hits the T-Drop releases endpoint', async () => {
      mockGithubRelease('v0.3.1')
      await checkForUpdatesManual()
      expect(mocks.netRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: 'https://api.github.com/repos/TXAVL/T-Drop/releases/latest'
      }))
    })
  })
})
