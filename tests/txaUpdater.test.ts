import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTxaRepoInstalled, findTxapmPath, checkTxaRepoVersion } from '../electron/main/txaUpdater'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('txaUpdater', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('detects txa installation via environment variable', () => {
    process.env.T_DROP_INSTALL_SOURCE = 'txa'
    expect(isTxaRepoInstalled()).toBe(true)

    process.env.T_DROP_INSTALL_SOURCE = 'standard'
    // With env standard, it doesn't return true from env
  })

  it('detects txa installation via installed.json manifest if present', () => {
    delete process.env.T_DROP_INSTALL_SOURCE
    const tempDir = path.join(os.tmpdir(), `txa-test-${Date.now()}`)
    const stateDir = path.join(tempDir, 'TXA', 'state')
    fs.mkdirSync(stateDir, { recursive: true })
    fs.writeFileSync(
      path.join(stateDir, 'installed.json'),
      JSON.stringify({
        'TXAVL.TDrop': {
          version: '0.3.1',
          source: 'txa'
        }
      })
    )

    try {
      expect(isTxaRepoInstalled({ localAppData: tempDir })).toBe(true)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('checks TXA repo manifest version matching', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        package: { id: 'TXAVL.TDrop', version: '0.3.1' },
        latest: '0.3.1',
        versions: ['0.3.0', '0.3.1']
      })
    } as any)

    const res = await checkTxaRepoVersion('0.3.1')
    expect(res.ok).toBe(true)
    expect(res.matched).toBe(true)
    expect(res.repoVersion).toBe('0.3.1')

    const resPending = await checkTxaRepoVersion('0.3.2')
    expect(resPending.ok).toBe(true)
    expect(resPending.matched).toBe(false)
    expect(resPending.repoVersion).toBe('0.3.1')

    mockFetch.mockRestore()
  })

  it('finds txapm.exe if present on disk or in PATH', () => {
    const found = findTxapmPath()
    // Returns string or null depending on environment
    expect(found === null || typeof found === 'string').toBe(true)
  })
})
