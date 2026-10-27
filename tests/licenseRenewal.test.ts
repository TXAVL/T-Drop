import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildTransferContent, renewedExpiry, PLAN_DAYS } from '../shared/license'

const root = join(__dirname, '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')
const DAY = 24 * 60 * 60 * 1000

describe('transfer note', () => {
  it('starts with the order code without its hyphen so the webhook can match it', () => {
    expect(buildTransferContent('TDR-MVQRQBX0', 'VIP', false)).toBe('TDRMVQRQBX0 MUA VIP')
    expect(buildTransferContent('TDR-MVQRQBX0', 'PREMIUM', true)).toBe('TDRMVQRQBX0 GIA HAN PREMIUM')
  })

  it('stays ASCII and short enough for bank note limits', () => {
    const note = buildTransferContent(`TDR-${Date.now().toString(36).toUpperCase()}`, 'PREMIUM', true)
    expect(note).toMatch(/^[\x20-\x7E]+$/)
    expect(note.length).toBeLessThanOrEqual(40)
  })

  it('is recoverable by the webhook matcher even when the bank strips spaces', () => {
    const src = read('supabase/functions/sepay-webhook/index.ts')
    const re = new RegExp(src.match(/content\.matchAll\(\/(.+?)\/g\)/)![1], 'g')
    const squashed = buildTransferContent('TDR-MVQRQBX0', 'VIP', true).replace(/\s+/g, '')
    const candidates = new Set<string>()
    for (const m of squashed.matchAll(re)) {
      for (let len = Math.min(16, m[1].length); len >= 6; len--) candidates.add(`TDR-${m[1].slice(0, len)}`)
    }
    expect(candidates.has('TDR-MVQRQBX0')).toBe(true)
  })
})

describe('renewal expiry (mirrors tdrop_fulfill_order)', () => {
  const now = Date.UTC(2026, 9, 27, 12)

  it('stacks the plan days onto a still-valid expiry', () => {
    const current = new Date(now + 10 * DAY).toISOString()
    expect(renewedExpiry(current, 'VIP', now).getTime()).toBe(now + (10 + PLAN_DAYS.VIP) * DAY)
    expect(renewedExpiry(current, 'PREMIUM', now).getTime()).toBe(now + (10 + PLAN_DAYS.PREMIUM) * DAY)
  })

  it('starts from now when the license already lapsed or has no expiry', () => {
    expect(renewedExpiry(new Date(now - 3 * DAY).toISOString(), 'VIP', now).getTime()).toBe(now + 30 * DAY)
    expect(renewedExpiry(null, 'VIP', now).getTime()).toBe(now + 30 * DAY)
  })

  it('server uses the same rule', () => {
    const sql = read('supabase/migrations/20261027_tdrop_renewal_and_auto_approval.sql')
    expect(sql).toContain('greatest(coalesce(v_lic.expires_at, now()), now()) + v_days')
  })
})

describe('renew is its own screen', () => {
  it('Extend opens the checkout in renew mode, Buy in buy mode', () => {
    const settings = read('src/components/Settings.tsx')
    expect(settings).toMatch(/onClick=\{handleOpenRenew\}\s*>\s*\{t\('license\.extend'\)\}/)
    expect(settings).toContain("const handleOpenPurchase = () => openCheckout('buy')")
    expect(read('src/main.tsx')).toContain("<PurchaseWindowView mode={mode} />")
  })

  it('renew orders carry the key they extend', () => {
    const modal = read('src/components/PurchaseModal.tsx')
    expect(modal).toContain('renew_key: current.key')
    expect(modal).toContain('fetchRenewalInfo(info.key, info.hwHash)')
  })
})
