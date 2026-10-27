import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildReceiptHtml, receiptFileName, vndInWords, type ReceiptData } from '../shared/receipt'

const root = join(__dirname, '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const base: ReceiptData = {
  orderCode: 'TDR-MVQRQBX0',
  paidAt: '2026-10-27T15:10:00Z',
  buyerEmail: 'khach@gmail.com',
  machineId: '1A0CE1',
  role: 'VIP',
  days: 30,
  amount: 29000,
  renewed: false,
  licenseKey: 'TDR_1A0CE1_X8K2M',
  expiresAt: '2026-11-26T15:10:00Z',
  paymentRef: 'sepay:1:FT1'
}

describe('vndInWords', () => {
  it.each([
    [0, 'Không đồng'],
    [11, 'Mười một đồng'],
    [15, 'Mười lăm đồng'],
    [21, 'Hai mươi mốt đồng'],
    [24, 'Hai mươi tư đồng'],
    [105, 'Một trăm linh năm đồng'],
    [1005, 'Một nghìn không trăm linh năm đồng'],
    [29000, 'Hai mươi chín nghìn đồng'],
    [49000, 'Bốn mươi chín nghìn đồng'],
    [1005000, 'Một triệu không trăm linh năm nghìn đồng'],
    [21350000, 'Hai mươi mốt triệu ba trăm năm mươi nghìn đồng'],
    [1000000000, 'Một tỷ đồng']
  ])('%i → %s', (n, words) => {
    expect(vndInWords(n)).toBe(words)
  })
})

describe('payment receipt', () => {
  it('is a receipt, never presented as a VAT invoice', () => {
    const html = buildReceiptHtml(base)
    expect(html).toContain('BIÊN NHẬN THANH TOÁN')
    expect(html).not.toMatch(/HÓA ĐƠN GIÁ TRỊ GIA TĂNG|Mã CQT|Mã số thuế|Chữ ký có hiệu lực/)
  })

  it('embeds the buyer signature and capitalised name, rejecting anything but a PNG data URL', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    const signed = buildReceiptHtml({ ...base, buyerSignature: png, buyerName: '  nguyễn   văn đức ' })
    expect(signed).toContain(`<img src="${png}"`)
    expect(signed).toContain('NGUYỄN VĂN ĐỨC')

    for (const bad of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,"><script>']) {
      expect(buildReceiptHtml({ ...base, buyerSignature: bad })).not.toContain(bad)
    }
    expect(buildReceiptHtml({ ...base, buyerName: '<b>x</b>' })).toContain('&lt;B&gt;X&lt;/B&gt;')
  })

  it('shows the order, amount in figures and words, key and Vietnam-time date', () => {
    const html = buildReceiptHtml({ ...base, role: 'PREMIUM', days: 60, amount: 49000, renewed: true })
    expect(html).toContain('TDR-MVQRQBX0')
    expect(html).toContain('49.000')
    expect(html).toContain('Bốn mươi chín nghìn đồng')
    expect(html).toContain('TDR_1A0CE1_X8K2M')
    expect(html).toContain('— Gia hạn')
    // 15:10 UTC = 22:10 in Vietnam
    expect(html).toMatch(/<span class="dot">22:10<\/span>/)
  })

  it('escapes customer-controlled fields', () => {
    const html = buildReceiptHtml({ ...base, buyerEmail: '<img src=x onerror=alert(1)>@gmail.com' })
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;@gmail.com')
  })

  it('builds a safe file name', () => {
    expect(receiptFileName('TDR-AB/../C:1')).toBe('T-Drop-BienNhan-TDR-AB..C1'.replace(/\./g, ''))
  })

  it('the e-mail webhook uses an identical copy of the template', () => {
    expect(read('supabase/functions/sepay-webhook/receipt.ts')).toBe(read('shared/receipt.ts'))
  })
})
