/**
 * T-Drop payment receipt ("Biên nhận thanh toán"), rendered as standalone A4 HTML.
 *
 * Layout follows the familiar Vietnamese e-invoice look (red patterned frame,
 * seller header, numbered goods table, amount in words, stamp box). It is titled
 * and worded as a RECEIPT: no tax authority code, no tax code, no digital
 * signature — a real "hóa đơn GTGT" can only come from a registered e-invoice provider.
 *
 * The buyer can sign by hand in the app (PNG data URL) and type their full name,
 * printed in capitals under the signature.
 *
 * Pure (no DOM/Node/Deno APIs): used by the Electron main process (print to PDF)
 * and copied verbatim into supabase/functions/sepay-webhook/receipt.ts for the
 * e-mail attachment (a test keeps both copies identical).
 */

export interface ReceiptData {
  orderCode: string
  /** ISO date-time the payment was confirmed. */
  paidAt: string
  buyerEmail: string
  machineId: string
  role: 'VIP' | 'PREMIUM'
  days: number
  amount: number
  renewed: boolean
  licenseKey: string
  expiresAt: string | null
  /** e.g. "sepay:123:FT2630..." or "manual" */
  paymentRef?: string | null
  /** Buyer's hand-drawn signature as a PNG data URL (validated by isSignatureDataUrl). */
  buyerSignature?: string | null
  /** Buyer's full name, printed in capitals under the signature. */
  buyerName?: string | null
}

const MAX_SIGNATURE_LENGTH = 600_000

/** Only a base64 PNG data URL of reasonable size is ever embedded in the receipt. */
export function isSignatureDataUrl(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.length < MAX_SIGNATURE_LENGTH &&
    /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(v)
  )
}

/** "nguyễn  văn a " → "NGUYỄN VĂN A" (Vietnamese-aware upper case, single spaces, max 60). */
export function normalizeBuyerName(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\s+/g, ' ').trim().slice(0, 60).toLocaleUpperCase('vi-VN')
}

export const RECEIPT_SELLER = {
  name: 'TXA STUDIO — T-DROP',
  website: 'https://txavl.github.io/T-Drop',
  bankName: 'MBBank (Ngân hàng Quân Đội)',
  accountNo: '2211231106',
  accountName: 'TANG XUAN ANH'
} as const

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const UNITS = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ']

/** Reads a 0–999 group. `full` = a higher group precedes it ("một nghìn không trăm linh năm"). */
function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const u = n % 10
  const out: string[] = []
  if (h > 0 || full) out.push(`${DIGITS[h]} trăm`)
  if (t === 0) {
    if (u > 0 && (h > 0 || full)) out.push('linh')
  } else if (t === 1) {
    out.push('mười')
  } else {
    out.push(`${DIGITS[t]} mươi`)
  }
  if (u > 0) {
    if (u === 1 && t > 1) out.push('mốt')
    else if (u === 5 && t > 0) out.push('lăm')
    else if (u === 4 && t > 1) out.push('tư')
    else out.push(DIGITS[u])
  }
  return out.join(' ')
}

/** 29000 → "Hai mươi chín nghìn đồng". Integers up to < 10^18. */
export function vndInWords(amount: number): string {
  let n = Math.round(Math.abs(amount))
  if (n === 0) return 'Không đồng'
  const groups: number[] = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) continue
    parts.push(readGroup(g, i < groups.length - 1) + UNITS[i])
  }
  const s = parts.join(' ').replace(/\s+/g, ' ').trim()
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} đồng`
}

export function formatVnd(n: number): string {
  return Math.round(n).toLocaleString('vi-VN')
}

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function vnParts(iso: string | null | undefined): { d: string; m: string; y: string; time: string } | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const f = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date)
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? ''
  return { d: get('day'), m: get('month'), y: get('year'), time: `${get('hour')}:${get('minute')}` }
}

function formatVnDateTime(iso: string | null | undefined): string {
  const p = vnParts(iso)
  return p ? `${p.d}/${p.m}/${p.y} ${p.time}` : 'Vĩnh viễn'
}

export function receiptFileName(orderCode: string): string {
  return `T-Drop-BienNhan-${orderCode.replace(/[^A-Za-z0-9_-]/g, '')}`
}

export function buildReceiptHtml(r: ReceiptData): string {
  const paid = vnParts(r.paidAt) ?? { d: '', m: '', y: '', time: '' }
  const serviceName = `Bản quyền T-Drop gói ${r.role} (${r.days} ngày)${r.renewed ? ' — Gia hạn' : ''}`
  const method = r.paymentRef && r.paymentRef !== 'manual' ? 'Chuyển khoản (VietQR) — tự động xác nhận' : 'Chuyển khoản (VietQR)'
  const money = formatVnd(r.amount)
  const signature = isSignatureDataUrl(r.buyerSignature) ? r.buyerSignature : ''
  const buyerName = normalizeBuyerName(r.buyerName)

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Biên nhận ${esc(r.orderCode)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: 'Times New Roman', Times, serif;
    color: #111;
    font-size: 12.5px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 9mm;
    display: flex;
    flex-direction: column;
  }
  .frame {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 5px;
    background:
      repeating-linear-gradient(45deg, #c8102e 0 3px, #fff 3px 6px) top / 100% 5px no-repeat,
      repeating-linear-gradient(45deg, #c8102e 0 3px, #fff 3px 6px) bottom / 100% 5px no-repeat,
      repeating-linear-gradient(45deg, #c8102e 0 3px, #fff 3px 6px) left / 5px 100% no-repeat,
      repeating-linear-gradient(45deg, #c8102e 0 3px, #fff 3px 6px) right / 5px 100% no-repeat;
  }
  .inner { flex: 1; border: 1px solid #e7a3ad; padding: 14px 18px 12px; display: flex; flex-direction: column; }
  .muted { font-style: italic; font-size: 10.5px; color: #333; }
  .seller { display: flex; gap: 14px; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px dashed #e7a3ad; }
  .logo {
    width: 58px; height: 58px; flex-shrink: 0; border-radius: 12px;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4);
    color: #fff; font: 700 22px/58px Arial, sans-serif; text-align: center;
  }
  .seller-name { font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 3px; }
  .seller div { line-height: 1.55; }
  .head { display: grid; grid-template-columns: 1fr 190px; align-items: center; padding: 14px 0 10px; border-bottom: 1px dashed #e7a3ad; }
  .title { text-align: center; }
  .title h1 { margin: 0; color: #c8102e; font-size: 25px; letter-spacing: .5px; }
  .title .date { margin-top: 6px; }
  .dot { display: inline-block; min-width: 26px; border-bottom: 1px dotted #555; text-align: center; padding: 0 3px; }
  .serial div { line-height: 1.8; }
  .buyer { padding: 8px 0; }
  .row { display: flex; gap: 6px; padding: 3px 0; border-bottom: 1px dotted #ddd; }
  .row b { white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #e7a3ad; padding: 6px 7px; vertical-align: middle; }
  th { background: #fdeef0; font-weight: 700; text-align: center; font-size: 12px; }
  th .muted { display: block; font-weight: 400; }
  .idx td { text-align: center; font-style: italic; font-size: 11px; color: #444; padding: 3px; }
  .num { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .total td { background: #fdeef0; font-weight: 700; }
  .words { padding: 8px 2px; border-bottom: 1px solid #e7a3ad; }
  .lic { margin-top: 10px; border: 1px solid #e7a3ad; background: #fffafb; padding: 8px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
  .key { font-family: Consolas, 'Courier New', monospace; font-weight: 700; letter-spacing: .5px; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; margin-top: 18px; text-align: center; align-items: start; }
  .buyer-sign { display: flex; flex-direction: column; align-items: center; }
  .buyer-sign img { display: block; width: 210px; height: 84px; object-fit: contain; margin-top: 6px; }
  .buyer-sign .blank { height: 84px; }
  .buyer-name { margin-top: 2px; min-width: 210px; padding-top: 4px; border-top: 1px dotted #777; font-weight: 700; letter-spacing: .3px; }
  .stamp {
    display: inline-block; margin-top: 8px; padding: 8px 14px; text-align: left;
    border: 1.5px solid #c8102e; color: #c8102e; position: relative; min-width: 250px; padding-right: 52px;
  }
  .stamp b { font-size: 14px; letter-spacing: .5px; }
  .check {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%) rotate(-8deg);
    color: #16a34a; font: 700 34px/1 Arial, sans-serif; opacity: .85;
  }
  .spacer { flex: 1; min-height: 20px; }
  .note { text-align: center; font-size: 11px; margin-top: 10px; }
  .page-no { text-align: center; font-size: 11px; margin-top: 4px; font-family: Arial, sans-serif; }
</style>
</head>
<body>
<div class="page">
 <div class="frame"><div class="inner">

  <div class="seller">
    <div class="logo">TD</div>
    <div>
      <div class="seller-name">${esc(RECEIPT_SELLER.name)}</div>
      <div><b>Website</b> <span class="muted">(Website)</span>: ${esc(RECEIPT_SELLER.website)}</div>
      <div><b>Số tài khoản</b> <span class="muted">(Account No.)</span>: ${esc(RECEIPT_SELLER.accountNo)} — ${esc(RECEIPT_SELLER.accountName)}</div>
      <div><b>Ngân hàng</b> <span class="muted">(Bank)</span>: ${esc(RECEIPT_SELLER.bankName)}</div>
    </div>
  </div>

  <div class="head">
    <div class="title">
      <h1>BIÊN NHẬN THANH TOÁN</h1>
      <div class="muted">(PAYMENT RECEIPT)</div>
      <div class="date">Ngày <span class="muted">(Date)</span> <span class="dot">${esc(paid.d)}</span>
        tháng <span class="muted">(month)</span> <span class="dot">${esc(paid.m)}</span>
        năm <span class="muted">(year)</span> <span class="dot">${esc(paid.y)}</span>
        lúc <span class="dot">${esc(paid.time)}</span></div>
    </div>
    <div class="serial">
      <div><b>Ký hiệu</b> <span class="muted">(Serial)</span>: <b>TDROP</b></div>
      <div><b>Số</b> <span class="muted">(No.)</span>: <b>${esc(r.orderCode)}</b></div>
    </div>
  </div>

  <div class="buyer">
    <div class="row"><b>Người mua</b> <span class="muted">(Buyer)</span>: <span>${esc(r.buyerEmail)}</span></div>
    <div class="row"><b>Mã máy</b> <span class="muted">(Machine ID)</span>: <span>${esc(r.machineId)}</span></div>
    <div class="row"><b>Hình thức thanh toán</b> <span class="muted">(Payment method)</span>: <span>${esc(method)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:42px">STT<span class="muted">(No)</span></th>
        <th>Tên dịch vụ<span class="muted">(Name of service)</span></th>
        <th style="width:84px">Đơn vị tính<span class="muted">(Unit)</span></th>
        <th style="width:66px">Số lượng<span class="muted">(Quantity)</span></th>
        <th style="width:100px">Đơn giá<span class="muted">(Unit price)</span></th>
        <th style="width:110px">Thành tiền<span class="muted">(Amount)</span></th>
      </tr>
    </thead>
    <tbody>
      <tr class="idx"><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6 = 4 × 5</td></tr>
      <tr>
        <td class="center">1</td>
        <td>${esc(serviceName)}</td>
        <td class="center">gói</td>
        <td class="center">1</td>
        <td class="num">${money}</td>
        <td class="num">${money}</td>
      </tr>
      <tr class="total">
        <td colspan="5">TỔNG CỘNG <span class="muted">(Grand total)</span>:</td>
        <td class="num">${money}</td>
      </tr>
    </tbody>
  </table>

  <div class="words"><b>SỐ TIỀN VIẾT BẰNG CHỮ</b> <span class="muted">(Amount in words)</span>: <b>${esc(vndInWords(r.amount))}</b></div>

  <div class="lic">
    <div><b>Mã bản quyền</b> <span class="muted">(License key)</span>: <span class="key">${esc(r.licenseKey)}</span></div>
    <div><b>Hiệu lực đến</b> <span class="muted">(Valid until)</span>: <b>${esc(formatVnDateTime(r.expiresAt))}</b></div>
    <div><b>Gói</b> <span class="muted">(Plan)</span>: ${esc(r.role)} · ${r.days} ngày${r.renewed ? ' (cộng dồn vào hạn cũ)' : ''}</div>
    <div><b>Mã tra cứu</b> <span class="muted">(Reference)</span>: ${esc(r.paymentRef || r.orderCode)}</div>
  </div>

  <div class="sign">
    <div class="buyer-sign">
      <div>Người mua <span class="muted">(Buyer)</span></div>
      ${signature ? `<img src="${signature}" alt="Chữ ký người mua">` : '<div class="blank"></div>'}
      ${buyerName ? `<div class="buyer-name">${esc(buyerName)}</div>` : ''}
    </div>
    <div>
      Người bán <span class="muted">(Seller)</span><br>
      <div class="stamp">
        <b>ĐÃ THANH TOÁN</b> <span class="muted" style="color:#c8102e">(Paid)</span><br>
        Xác nhận bởi: ${esc(RECEIPT_SELLER.name)}<br>
        Ngày xác nhận: ${esc(`${paid.d}/${paid.m}/${paid.y}`)}
        <span class="check">✓</span>
      </div>
    </div>
  </div>

  <div class="spacer"></div>
  <div class="note"><b><i>Cảm ơn Quý khách đã tin dùng T-Drop!</i></b>
    <i>Cần hỗ trợ, vui lòng liên hệ qua ${esc(RECEIPT_SELLER.website)} và cung cấp số biên nhận ${esc(r.orderCode)}.</i><br>
    <i>(Thank you for choosing T-Drop! For support, visit ${esc(RECEIPT_SELLER.website)} and quote receipt no. ${esc(r.orderCode)}.)</i></div>

 </div></div>
 <div class="page-no">Trang 1/1</div>
</div>
</body>
</html>`
}
