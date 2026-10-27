// License e-mail. Two free providers, picked by which secrets are set:
//
// 1) Gmail SMTP (preferred: no domain to verify, ~500 mails/day, lands in Inbox
//    because it really comes from your Gmail):
//      GMAIL_USER          your Gmail address, e.g. txastudio@gmail.com
//      GMAIL_APP_PASSWORD  16-char App Password (Google account > Security >
//                          2-Step Verification > App passwords). NOT your normal password.
//    Uses port 465 (implicit TLS): Supabase Edge Functions block 25 and 587.
//
// 2) Resend (3,000/month, needs a verified domain):
//      RESEND_API_KEY, MAIL_FROM (default "T-Drop <noreply@txastudio.click>")
//
// With neither set, mail is skipped: the app still auto-activates, so the
// e-mail is only a receipt / backup.
import nodemailer from 'npm:nodemailer@6.9.16'

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

async function sendViaGmail(o: FulfilledOrder, user: string, pass: string): Promise<string> {
  const { subject, html, text } = buildLicenseMail(o)
  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: pass.replace(/\s+/g, '') }
    })
    await transport.sendMail({ from: `"T-Drop" <${user}>`, to: o.email, subject, html, text })
    return 'sent'
  } catch (err) {
    return `error_gmail: ${(err as Error).message}`.slice(0, 240)
  }
}

async function sendViaResend(o: FulfilledOrder, apiKey: string): Promise<string> {
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
    return `error_resend_${res.status}: ${(await res.text()).slice(0, 200)}`
  } catch (err) {
    return `error_resend: ${(err as Error).message}`
  }
}

/** Returns 'sent', 'skipped' (no provider configured) or an error string. Never throws. */
export function sendLicenseMail(o: FulfilledOrder): Promise<string> {
  const gmailUser = Deno.env.get('GMAIL_USER')
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
  if (gmailUser && gmailPass) return sendViaGmail(o, gmailUser, gmailPass)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) return sendViaResend(o, resendKey)
  return Promise.resolve('skipped')
}
