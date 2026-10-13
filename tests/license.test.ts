import { describe, it, expect } from 'vitest'
import { TxaLicense } from '../electron/main/license'
import { isValidKeyFormat, getDaysRemaining, isValidEmailDomain, getVietQrImageUrl } from '../shared/license'

describe('TxaLicense & License Format', () => {
  it('generates a key matching the format TDR_[HW_HASH]_[RANDOM_5]', () => {
    const key = TxaLicense.generateKey('B7X9Q2')
    expect(key).toMatch(/^TDR_B7X9Q2_[A-Z0-9]{5}$/)
    expect(key.length).toBe(16)
    expect(isValidKeyFormat(key)).toBe(true)
  })

  it('generates a random key if no hwHash provided', () => {
    const key = TxaLicense.generateKey()
    expect(key).toMatch(/^TDR_[A-Z0-9]{6}_[A-Z0-9]{5}$/)
    expect(key.length).toBe(16)
    expect(isValidKeyFormat(key)).toBe(true)
  })

  it('validates key format correctly', () => {
    expect(isValidKeyFormat('TDR_A8B9C1_X8K2M')).toBe(true)
    expect(isValidKeyFormat('tdr_a8b9c1_x8k2m')).toBe(true)
    expect(isValidKeyFormat('INVALID_KEY')).toBe(false)
    expect(isValidKeyFormat('')).toBe(false)
  })

  it('calculates days remaining properly', () => {
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysRemaining(in30Days)).toBe(30)

    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysRemaining(in60Days)).toBe(60)

    const expired = new Date(Date.now() - 1000).toISOString()
    expect(getDaysRemaining(expired)).toBe(0)

    expect(getDaysRemaining(null)).toBe(null)
  })

  it('validates allowed email domains correctly (gmail, icloud, outlook, hotmail)', () => {
    expect(isValidEmailDomain('test@gmail.com')).toBe(true)
    expect(isValidEmailDomain('user@icloud.com')).toBe(true)
    expect(isValidEmailDomain('dev@outlook.com')).toBe(true)
    expect(isValidEmailDomain('vip@hotmail.com')).toBe(true)
    expect(isValidEmailDomain('hacker@tempmail.com')).toBe(false)
    expect(isValidEmailDomain('spam@yahoo.com')).toBe(false)
    expect(isValidEmailDomain('invalid')).toBe(false)
    expect(isValidEmailDomain('')).toBe(false)
  })

  it('generates VietQR image URL with correct parameters', () => {
    const url = getVietQrImageUrl(29000, 'TDROP VIP A8B9C1 ORD123')
    expect(url).toContain('https://img.vietqr.io/image/MB-2211231106-compact2.png')
    expect(url).toContain('amount=29000')
    expect(url).toContain('addInfo=TDROP%20VIP%20A8B9C1%20ORD123')
  })
})
