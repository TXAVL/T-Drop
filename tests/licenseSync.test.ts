import { describe, it, expect } from 'vitest'
import { parseSyncResponse, licenseChanged, daysLeft } from '../electron/main/licenseSync'

describe('parseSyncResponse', () => {
  it('reads a good answer', () => {
    expect(parseSyncResponse({ ok: true, role: 'PREMIUM', expires_at: '2026-12-31T12:45:36Z', user_name: 'A' })).toEqual({
      kind: 'ok', role: 'PREMIUM', expiresAt: '2026-12-31T12:45:36Z', userName: 'A'
    })
  })
  it('treats an unknown role as VIP and a null expiry as lifetime', () => {
    const a = parseSyncResponse({ ok: true, role: 'MASTER', expires_at: null })
    expect(a).toMatchObject({ kind: 'ok', role: 'VIP', expiresAt: null })
  })
  it('flags only definitive refusals as invalid', () => {
    for (const code of ['NOT_FOUND', 'INACTIVE', 'EXPIRED', 'HARDWARE_MISMATCH']) {
      expect(parseSyncResponse({ ok: false, code })).toEqual({ kind: 'invalid', code })
    }
  })
  it('never invalidates on anything unexpected', () => {
    expect(parseSyncResponse(null)).toEqual({ kind: 'unknown' })
    expect(parseSyncResponse('x')).toEqual({ kind: 'unknown' })
    expect(parseSyncResponse({ ok: false, code: 'NOT_ACTIVATED' })).toEqual({ kind: 'unknown' })
    expect(parseSyncResponse({ ok: false })).toEqual({ kind: 'unknown' })
  })
})

describe('licenseChanged', () => {
  it('detects a role change', () => {
    expect(licenseChanged({ role: 'VIP', expiresAt: '2026-12-16T00:00:00Z' }, { role: 'PREMIUM', expiresAt: '2026-12-16T00:00:00Z' })).toBe(true)
  })
  it('detects an extension', () => {
    expect(licenseChanged({ role: 'VIP', expiresAt: '2026-12-16T00:00:00Z' }, { role: 'VIP', expiresAt: '2026-12-31T00:00:00Z' })).toBe(true)
  })
  it('ignores formatting differences of the same instant', () => {
    expect(licenseChanged({ role: 'VIP', expiresAt: '2026-12-16T12:45:36.171643+00:00' }, { role: 'VIP', expiresAt: '2026-12-16T12:45:36.171Z' })).toBe(false)
  })
  it('handles lifetime on either side', () => {
    expect(licenseChanged({ role: 'VIP', expiresAt: null }, { role: 'VIP', expiresAt: null })).toBe(false)
    expect(licenseChanged({ role: 'VIP', expiresAt: null }, { role: 'VIP', expiresAt: '2026-12-31T00:00:00Z' })).toBe(true)
  })
})

describe('daysLeft', () => {
  const now = new Date('2026-11-04T12:00:00Z').getTime()
  it('rounds up to whole days', () => {
    expect(daysLeft('2026-11-06T00:00:00Z', now)).toBe(2)
    expect(daysLeft('2026-11-04T18:00:00Z', now)).toBe(1)
  })
  it('is null for lifetime or garbage', () => {
    expect(daysLeft(null, now)).toBeNull()
    expect(daysLeft('nope', now)).toBeNull()
  })
})
