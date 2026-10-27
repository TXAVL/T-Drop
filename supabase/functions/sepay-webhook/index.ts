// SePay → T-Drop auto-approval.
//
// SePay POSTs every incoming bank transfer here with `Authorization: Apikey <key>`.
// We match the transfer to a pending tdrop_orders row, check the amount, then call
// tdrop_fulfill_order (mint a key, or extend the existing one for a renewal).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   SEPAY_API_KEY        required — the API key you set on the SePay webhook (fail-closed if missing)
//   SEPAY_ACCOUNT_NUMBER optional — only accept transfers into this account (e.g. 2211231106)
//   RESEND_API_KEY       optional — e-mail the key/receipt to the buyer (see mail.ts)
//   MAIL_FROM            optional — sender, default "T-Drop <noreply@txastudio.click>"
// Deploy with verify_jwt = false: SePay cannot send a Supabase JWT; the Apikey check is the auth.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendLicenseMail } from './mail.ts'

interface SepayPayload {
  id: number
  gateway?: string
  transactionDate?: string
  accountNumber?: string
  code?: string | null
  content?: string
  transferType?: 'in' | 'out'
  transferAmount?: number
  referenceCode?: string
  description?: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ success: false, error: 'method' }, 405)

  const expected = Deno.env.get('SEPAY_API_KEY') ?? ''
  const auth = req.headers.get('authorization') ?? ''
  const given = auth.replace(/^Apikey\s+/i, '').trim()
  if (!expected || !timingSafeEqual(given, expected)) {
    return json({ success: false, error: 'unauthorized' }, 401)
  }

  let p: SepayPayload
  try {
    p = await req.json()
  } catch {
    return json({ success: false, error: 'bad json' }, 400)
  }
  if (typeof p?.id !== 'number') return json({ success: false, error: 'missing id' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  })

  const amount = Math.round(Number(p.transferAmount) || 0)
  const content = `${p.content ?? ''} ${p.description ?? ''} ${p.code ?? ''}`.toUpperCase()

  // Idempotency: SePay retries until it gets 2xx; a repeat id is acknowledged and ignored.
  const { error: logErr } = await db.from('tdrop_payments').insert({
    id: p.id,
    gateway: p.gateway ?? null,
    amount,
    content: p.content ?? null,
    reference_code: p.referenceCode ?? null,
    raw: p,
    result: 'received'
  })
  if (logErr) {
    if (logErr.code !== '23505') {
      console.error('[sepay] log insert failed', logErr)
      return json({ success: false, error: 'log' }, 500)
    }
    // Seen before: only reprocess a delivery that never finished (crash or fulfill error).
    const { data: prev } = await db.from('tdrop_payments').select('result').eq('id', p.id).single()
    if (prev && prev.result !== 'received' && prev.result !== 'fulfill_error') {
      return json({ success: true, duplicate: true, result: prev.result })
    }
  }

  const finish = async (result: string, orderCode: string | null, extra: Record<string, unknown> = {}) => {
    await db.from('tdrop_payments').update({ result, order_code: orderCode }).eq('id', p.id)
    console.log(`[sepay] tx=${p.id} amount=${amount} → ${result}${orderCode ? ` (${orderCode})` : ''}`)
    // Always 2xx for a handled delivery so SePay does not retry an unmatched transfer forever.
    return json({ success: true, result, order_code: orderCode, ...extra })
  }

  if (p.transferType && p.transferType !== 'in') return finish('ignored_outgoing', null)
  const wantAccount = Deno.env.get('SEPAY_ACCOUNT_NUMBER')
  if (wantAccount && p.accountNumber && p.accountNumber !== wantAccount) return finish('ignored_account', null)

  // 1) New clients put the order code in the note: "TDRMVQRQBX0 ..." (banks often drop the '-').
  //    Some banks also strip spaces ("TDRMVQRQBX0GIAHANVIP"), so try every prefix
  //    length of each run and let the database say which one is a real order.
  let orderCode: string | null = null
  const candidates = new Set<string>()
  for (const m of content.matchAll(/TDR-?([A-Z0-9]{6,32})/g)) {
    for (let len = Math.min(16, m[1].length); len >= 6; len--) candidates.add(`TDR-${m[1].slice(0, len)}`)
  }
  if (candidates.size) {
    const { data } = await db
      .from('tdrop_orders')
      .select('order_code')
      .in('order_code', [...candidates])
      .order('created_at', { ascending: false })
      .limit(1)
    if (data?.length) orderCode = data[0].order_code
  }

  // 2) Older app versions only wrote "machine ID: XXXXXX": take that machine's newest
  //    pending order whose price the transfer covers.
  if (!orderCode) {
    const m = content.match(/MACHINE\s*ID\s*:?\s*([A-Z0-9]{4,32})/)
    if (m) {
      const { data } = await db
        .from('tdrop_orders')
        .select('order_code')
        .eq('status', 'pending')
        .ilike('machine_id', m[1])
        .lte('amount', amount)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) orderCode = data.order_code
    }
  }

  if (!orderCode) return finish('unmatched', null)

  const { data: order } = await db
    .from('tdrop_orders')
    .select('order_code, amount, status')
    .eq('order_code', orderCode)
    .single()
  if (!order) return finish('unmatched', null)
  if (order.status === 'approved') return finish('already_approved', orderCode)
  if (order.status === 'rejected') return finish('order_rejected', orderCode)
  if (amount < order.amount) return finish(`underpaid_${amount}_of_${order.amount}`, orderCode)

  const { data: res, error } = await db.rpc('tdrop_fulfill_order', {
    p_order_code: orderCode,
    p_paid_amount: amount,
    p_payment_ref: `sepay:${p.id}${p.referenceCode ? `:${p.referenceCode}` : ''}`
  })
  if (error || !res?.ok) {
    console.error('[sepay] fulfill failed', error ?? res)
    await db.from('tdrop_payments').update({ result: 'fulfill_error', order_code: orderCode }).eq('id', p.id)
    // 5xx so SePay retries; fulfill is idempotent.
    return json({ success: false, error: 'fulfill' }, 500)
  }

  // Mail is a receipt/backup (the app activates on its own), so a mail failure
  // never fails the webhook — it is only recorded.
  const mail = await sendLicenseMail({
    order_code: orderCode,
    email: res.email,
    role: res.role,
    license_key: res.license_key,
    renewed: !!res.renewed,
    expires_at: res.expires_at
  })
  if (mail === 'sent') {
    await db.from('tdrop_orders').update({ emailed_at: new Date().toISOString() }).eq('order_code', orderCode)
  } else if (mail !== 'skipped') {
    console.error('[sepay] mail failed', orderCode, mail)
  }
  return finish(res.renewed ? 'renewed' : 'approved', orderCode, { mail })
})
