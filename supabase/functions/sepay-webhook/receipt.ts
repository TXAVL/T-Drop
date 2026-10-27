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

/**
 * App icon (resources/icon.png) downscaled to 160px JPEG, inlined so the receipt
 * renders the same in the PDF and in the e-mail attachment without loading files.
 */
const LOGO_DATA_URL =
  'data:image/jpeg;base64,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'

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
  .logo { width: 64px; height: 64px; flex-shrink: 0; border-radius: 14px; display: block; }
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
    <img class="logo" src="${LOGO_DATA_URL}" alt="T-Drop">
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
