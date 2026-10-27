// License e-mail via Resend (free tier: 3,000 mails/month, 100/day).
//
// Secrets:
//   RESEND_API_KEY  required to send; without it mail is skipped (the app still
//                   auto-activates, so the e-mail is only a receipt / backup).
//   MAIL_FROM       optional, default "T-Drop <noreply@txastudio.click>".
//                   The domain must be verified in Resend.

export interface FulfilledOrder {
  order_code: string
  email: string
  role: string
  license_key: string
  renewed: boolean
  expires_at?: string | null
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function formatVnDate(iso?: string | null): string {
  if (!iso) return 'Vĩnh viễn'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso))
}

export function buildLicenseMail(o: FulfilledOrder): { subject: string; html: string; text: string } {
  const expiry = formatVnDate(o.expires_at)
  const subject = o.renewed
    ? `T-Drop: Gia hạn gói ${o.role} thành công (hạn mới ${expiry})`
    : `T-Drop: Mã bản quyền gói ${o.role} của bạn`

  const intro = o.renewed
    ? `Cảm ơn bạn đã gia hạn T-Drop! Gói <b>${esc(o.role)}</b> của bạn đã được cộng thêm thời gian. Bạn <b>không cần nhập mã mới</b>, T-Drop tự cập nhật hạn dùng.`
    : `Cảm ơn bạn đã mua T-Drop! Gói <b>${esc(o.role)}</b> đã được kích hoạt. Nếu T-Drop chưa tự kích hoạt, hãy nhập mã bên dưới.`

  const steps = o.renewed
    ? `<p style="margin:0 0 8px">Nếu hạn trong ứng dụng chưa đổi: mở <b>Cài đặt → Bản quyền</b> và bấm <b>Xác minh</b>.</p>`
    : `<ol style="margin:0 0 8px;padding-left:20px">
         <li>Mở T-Drop → <b>Cài đặt</b> → mục <b>Bản quyền</b>.</li>
         <li>Dán mã vào ô nhập và bấm <b>Xác minh</b>.</li>
       </ol>
       <p style="margin:0 0 8px;color:#666">Mã chỉ dùng được trên máy đã đặt mua.</p>`

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 12px;font-size:20px">${o.renewed ? 'Gia hạn thành công 🎉' : 'Mã bản quyền T-Drop 🎉'}</h2>
    <p style="margin:0 0 16px;line-height:1.5">${intro}</p>
    <div style="background:#f6f3ff;border:1px solid #d9ccff;border-radius:10px;padding:14px;margin:0 0 16px">
      <div style="font-size:12px;color:#666">Mã bản quyền</div>
      <div style="font-family:Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:1px">${esc(o.license_key)}</div>
      <div style="font-size:13px;margin-top:8px">Gói: <b>${esc(o.role)}</b> · Hạn dùng đến: <b>${esc(expiry)}</b></div>
    </div>
    ${steps}
    <p style="margin:16px 0 0;font-size:12px;color:#888">Mã đơn: ${esc(o.order_code)}. Vui lòng giữ e-mail này để tra cứu khi cần.</p>
  </div></body></html>`

  const text = [
    o.renewed ? 'Gia hạn T-Drop thành công!' : 'Mã bản quyền T-Drop của bạn',
    '',
    `Mã bản quyền: ${o.license_key}`,
    `Gói: ${o.role} - Hạn dùng đến: ${expiry}`,
    '',
    o.renewed
      ? 'Bạn không cần nhập mã mới. Nếu hạn chưa đổi: Cài đặt > Bản quyền > Xác minh.'
      : 'Cách kích hoạt: Mở T-Drop > Cài đặt > Bản quyền, dán mã và bấm Xác minh.',
    '',
    `Mã đơn: ${o.order_code}`
  ].join('\n')

  return { subject, html, text }
}

/** Returns 'sent', 'skipped' (no API key) or an error string. Never throws. */
export async function sendLicenseMail(o: FulfilledOrder): Promise<string> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return 'skipped'
  const { subject, html, text } = buildLicenseMail(o)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') || 'T-Drop <noreply@txastudio.click>',
        to: [o.email],
        subject,
        html,
        text
      })
    })
    if (res.ok) return 'sent'
    return `error_${res.status}: ${(await res.text()).slice(0, 200)}`
  } catch (err) {
    return `error: ${(err as Error).message}`
  }
}
