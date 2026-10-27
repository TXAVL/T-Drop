/**
 * PurchaseModal & PurchaseWindowView — VietQR Payment & Key Order Flow.
 * Automatically saves order to Supabase tdrop_orders before rendering VietQR code.
 *
 * Two screens share the payment step:
 *  - mode 'buy'   : pick a plan, enter email, get a new key.
 *  - mode 'renew' : extend the key already active on this machine; email is
 *                   filled from the server and days stack onto the current expiry.
 * After the QR is shown the order is polled; once the SePay webhook (or an admin)
 * approves it, the key is activated / re-verified automatically.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SUPABASE_CONFIG,
  VIETQR_CONFIG,
  PLAN_DAYS,
  isValidEmailDomain,
  getVietQrImageUrl,
  buildTransferContent,
  renewedExpiry,
  formatExpiryDate,
  getDaysRemaining,
  type TdropOrder
} from '../../shared/license'
import { fetchOrderStatus, fetchRenewalInfo } from '../lib/licenseApi'
import { playButtonClickSound } from '../lib/soundEffects'
import { useStore } from '../store/appStore'
import { t } from '../i18n'
import { CloseIcon, CopyIcon, CheckIcon, CrownIcon } from './icons'
import { ToastStack } from './Toast'
import { SignaturePad, type SignaturePadHandle } from './SignaturePad'
import { normalizeBuyerName } from '../../shared/receipt'

type CheckoutMode = 'buy' | 'renew'

const ORDER_POLL_MS = 5000
const ORDER_POLL_MAX_MS = 30 * 60 * 1000

interface PurchaseModalProps {
  open: boolean
  onClose: () => void
  machineId?: string
  mode?: CheckoutMode
}

export function PurchaseModal({ open, onClose, machineId: propMachineId, mode = 'buy' }: PurchaseModalProps) {
  if (!open) return null
  return <PurchaseWindowContent onClose={onClose} initialMachineId={propMachineId} isModal={true} mode={mode} />
}

export function PurchaseWindowView({ mode = 'buy' }: { mode?: CheckoutMode }) {
  const handleClose = () => {
    if (window.edge?.closePurchaseWindow) {
      void window.edge.closePurchaseWindow()
    } else {
      window.close()
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0d11',
        color: '#ffffff',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative'
      }}
    >
      {/* Toast notifications */}
      <ToastStack />
      {/* Draggable Titlebar */}
      <header
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          // @ts-ignore
          WebkitAppRegion: 'drag'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <CrownIcon width={16} height={16} fill="#f59e0b" />
          <span>{mode === 'renew' ? t('renew.windowTitle') : 'T-Drop — Nâng Cấp Bản Quyền VIP & PREMIUM'}</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          style={{
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)' }}
          title="Đóng cửa sổ"
        >
          <CloseIcon width={14} height={14} />
        </button>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <PurchaseWindowContent onClose={handleClose} isModal={false} mode={mode} />
      </div>
    </div>
  )
}

interface CurrentLicense {
  key: string
  role: 'VIP' | 'PREMIUM'
  expiresAt: string | null
}

function PurchaseWindowContent({
  onClose,
  initialMachineId,
  isModal = false,
  mode = 'buy'
}: {
  onClose: () => void
  initialMachineId?: string
  isModal?: boolean
  mode?: CheckoutMode
}) {
  const [role, setRole] = useState<'VIP' | 'PREMIUM'>('VIP')
  // Renew: the license active on this machine (null while loading / none found).
  const [current, setCurrent] = useState<CurrentLicense | null>(null)
  const [currentLoaded, setCurrentLoaded] = useState(mode !== 'renew')
  const [emailPrefilled, setEmailPrefilled] = useState(false)
  const [payment, setPayment] = useState<'waiting' | 'done' | 'manual'>('waiting')
  // A renew request with no key on this machine falls back to the normal purchase.
  const isRenew = mode === 'renew' && !!current
  const [machineId, setMachineId] = useState(initialMachineId || '')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<TdropOrder | null>(null)
  const [copiedStk, setCopiedStk] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [copiedMachineId, setCopiedMachineId] = useState(false)
  const [inlineKey, setInlineKey] = useState('')
  const [activatingKey, setActivatingKey] = useState(false)
  const [activationMsg, setActivationMsg] = useState<{ text: string; ok: boolean } | null>(null)
  // Set once the license is active: replaces the QR/payment details with a success screen.
  // fromPayment: confirmed by the order itself (not a key typed in), so a receipt can be issued.
  const [paidInfo, setPaidInfo] = useState<{
    key: string
    role: 'VIP' | 'PREMIUM'
    expiresAt: string | null
    renewed: boolean
    fromPayment: boolean
    paidAt: string
  } | null>(null)
  const [savingReceipt, setSavingReceipt] = useState(false)
  // Receipt flow: draw a signature, then type the full name printed under it.
  const [receiptStep, setReceiptStep] = useState<'idle' | 'sign' | 'name'>('idle')
  const [signature, setSignature] = useState<string | null>(null)
  const [signEmpty, setSignEmpty] = useState(true)
  const [buyerName, setBuyerName] = useState('')
  const signRef = useRef<SignaturePadHandle>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const emailInputRef = useRef<HTMLInputElement>(null)
  const inlineKeyInputRef = useRef<HTMLInputElement>(null)

  // Keep window focusable and hotkeys paused cleanly for the entire duration the modal/view is open
  useEffect(() => {
    try {
      void window.edge?.focusWindow?.(true)
      void window.edge?.pauseHotkey?.(true)
    } catch {}
    const focusTimer = setTimeout(() => {
      emailInputRef.current?.focus()
    }, 120)
    return () => {
      clearTimeout(focusTimer)
      try {
        void window.edge?.focusWindow?.(false)
        void window.edge?.pauseHotkey?.(false)
      } catch {}
    }
  }, [])

  const pushToast = useStore((s) => s.pushToast)

  useEffect(() => {
    if (!window.edge?.getLicenseDeviceInfo) {
      setCurrentLoaded(true)
      return
    }
    let cancelled = false
    window.edge.getLicenseDeviceInfo().then(async (info) => {
      if (cancelled) return
      if (info?.hwHash) setMachineId((prev) => prev || info.hwHash)
      if (mode !== 'renew') return
      if (!info?.isPro || !info.key) {
        setCurrentLoaded(true)
        return
      }
      const curRole = info.role === 'PREMIUM' ? 'PREMIUM' : 'VIP'
      setCurrent({ key: info.key, role: curRole, expiresAt: info.expiresAt ?? null })
      setRole(curRole)
      setCurrentLoaded(true)
      // The customer already bought once: fill the email they used, looked up by key + machine.
      const remote = await fetchRenewalInfo(info.key, info.hwHash)
      if (cancelled || !remote?.ok) return
      if (remote.email) {
        setEmail((prev) => prev || remote.email || '')
        setEmailPrefilled(true)
        setEmailError('')
      }
      if (remote.expires_at) {
        setCurrent((c) => (c ? { ...c, expiresAt: remote.expires_at ?? c.expiresAt } : c))
      }
    }).catch((err) => {
      console.error(err)
      setCurrentLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [mode])

  const handleValidateEmail = (val: string) => {
    setEmail(val)
    if (!val.trim()) {
      setEmailError(t('purchase.emailRequired'))
    } else if (!isValidEmailDomain(val)) {
      setEmailError(t('purchase.emailInvalid'))
    } else {
      setEmailError('')
    }
  }

  const handlePasteEmail = async () => {
    try {
      let text = ''
      if (window.edge?.readClipboardText) {
        text = await window.edge.readClipboardText()
      } else {
        text = await navigator.clipboard.readText()
      }
      if (text) {
        handleValidateEmail(text.trim())
      }
    } catch {}
  }

  const handleCopyMachineId = () => {
    if (!machineId) return
    navigator.clipboard.writeText(machineId)
    setCopiedMachineId(true)
    setTimeout(() => setCopiedMachineId(false), 1500)
  }

  const handleCreateOrder = useCallback(async () => {
    if (!email.trim()) {
      setEmailError(t('purchase.emailRequired'))
      pushToast({
        id: Date.now().toString(),
        message: t('purchase.emailRequired'),
        tone: 'error'
      })
      emailInputRef.current?.focus()
      return
    }

    if (!isValidEmailDomain(email)) {
      setEmailError(t('purchase.emailInvalid'))
      pushToast({
        id: Date.now().toString(),
        message: t('purchase.emailInvalid'),
        tone: 'error'
      })
      emailInputRef.current?.focus()
      return
    }

    setSubmitting(true)
    playButtonClickSound()

    const orderCode = `TDR-${Date.now().toString(36).toUpperCase()}`
    const amount = VIETQR_CONFIG.prices[role]
    const transferContent = buildTransferContent(orderCode, role, isRenew)

    const newOrder: TdropOrder = {
      order_code: orderCode,
      machine_id: machineId || 'UNKNOWN',
      role,
      amount,
      email: email.trim().toLowerCase(),
      transfer_content: transferContent,
      status: 'pending',
      ...(isRenew && current ? { renew_key: current.key } : {})
    }

    const postOrder = (body: TdropOrder) =>
      fetch(`${SUPABASE_CONFIG.url}/rest/v1/tdrop_orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.publishableKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.publishableKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      })

    try {
      let res = await postOrder(newOrder)
      // Server without the renewal migration rejects the unknown column. Keep the
      // order (the "GIA HAN" note tells the admin) rather than blocking the customer.
      if (!res.ok && newOrder.renew_key && res.status === 400) {
        const { renew_key: _drop, ...legacy } = newOrder
        res = await postOrder(legacy)
      }

      if (!res.ok) {
        const errText = await res.text()
        console.error('[Purchase] Supabase order insert failed:', errText)
        pushToast({
          id: Date.now().toString(),
          message: t('purchase.orderFailed'),
          tone: 'error'
        })
        return
      }

      setPayment('waiting')
      setOrder(newOrder)
      pushToast({
        id: Date.now().toString(),
        message: t('purchase.orderSuccess'),
        tone: 'info'
      })
    } catch (err: any) {
      console.error('[Purchase] Order creation error:', err)
      pushToast({
        id: Date.now().toString(),
        message: t('license.connectionError', { error: err?.message || String(err) }),
        tone: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }, [email, role, machineId, pushToast, isRenew, current])

  // ── Auto-detect payment ────────────────────────────────────────────────
  // Poll the order; once approved (SePay webhook or admin), activate the new key —
  // or re-verify the existing one for a renewal, which pulls the extended expiry.
  useEffect(() => {
    if (!order || payment !== 'waiting' || !machineId) return
    let cancelled = false
    let timer: number | undefined
    const startedAt = Date.now()

    const finish = async (key: string) => {
      const res = await window.edge.activateLicense(key)
      if (cancelled) return
      if (res.ok) {
        const activatedRole = res.role === 'PREMIUM' ? 'PREMIUM' : 'VIP'
        void useStore.getState().patchSettings({
          isPro: true,
          licenseKey: key,
          licenseRole: activatedRole,
          licenseUserName: res.userName || 'Khách hàng',
          licenseExpiresAt: res.expiresAt || null
        })
        const text = isRenew
          ? t('renew.success', { date: formatExpiryDate(res.expiresAt) })
          : res.message || t('purchase.activatedSuccess', { role: activatedRole })
        setActivationMsg({ text, ok: true })
        setPaidInfo({
          key,
          role: activatedRole,
          expiresAt: res.expiresAt ?? null,
          renewed: isRenew,
          fromPayment: true,
          paidAt: new Date().toISOString()
        })
        setPayment('done')
        pushToast({ id: Date.now().toString(), message: text, tone: 'info' })
      } else {
        // Approved but activation failed (e.g. offline): show the key path instead.
        setInlineKey(key)
        setActivationMsg({ text: res.message || t('license.activateFailed'), ok: false })
        setPayment('manual')
      }
    }

    const tick = async () => {
      const st = await fetchOrderStatus(order.order_code, machineId)
      if (cancelled) return
      if (!st) {
        // Server has no status RPC yet: stay on the manual "key by email" flow.
        setPayment('manual')
        return
      }
      if (st.status === 'approved' && st.license_key) {
        await finish(st.license_key)
        return
      }
      if (st.status === 'rejected' || Date.now() - startedAt > ORDER_POLL_MAX_MS) {
        setPayment('manual')
        return
      }
      timer = window.setTimeout(() => void tick(), ORDER_POLL_MS)
    }
    timer = window.setTimeout(() => void tick(), ORDER_POLL_MS)
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [order, payment, machineId, isRenew, pushToast])

  const handleSaveReceipt = async () => {
    if (!order || !paidInfo || savingReceipt || !window.edge?.saveReceipt) return
    const name = normalizeBuyerName(buyerName)
    if (signature && !name) {
      nameInputRef.current?.focus()
      return
    }
    setSavingReceipt(true)
    playButtonClickSound()
    try {
      const res = await window.edge.saveReceipt({
        orderCode: order.order_code,
        paidAt: paidInfo.paidAt,
        buyerEmail: order.email,
        machineId: order.machine_id,
        role: order.role,
        days: PLAN_DAYS[order.role],
        amount: order.amount,
        renewed: paidInfo.renewed,
        licenseKey: paidInfo.key,
        expiresAt: paidInfo.expiresAt,
        paymentRef: null,
        buyerSignature: signature,
        buyerName: name || null
      })
      if (res.ok) setReceiptStep('idle')
      pushToast({
        id: Date.now().toString(),
        message: res.ok ? t('purchase.receiptSaved') : t('purchase.receiptFailed', { error: res.error || '' }),
        tone: res.ok ? 'info' : 'error'
      })
    } finally {
      setSavingReceipt(false)
    }
  }

  const handleActivateInlineKey = async () => {
    const trimmed = inlineKey.trim().toUpperCase()
    if (!trimmed || activatingKey) return
    setActivatingKey(true)
    playButtonClickSound()
    try {
      const res = await window.edge.activateLicense(trimmed)
      if (res.ok) {
        const activatedRole = res.role === 'PREMIUM' ? 'PREMIUM' : 'VIP'
        void useStore.getState().patchSettings({
          isPro: true,
          licenseKey: trimmed,
          licenseRole: activatedRole,
          licenseUserName: res.userName || 'Khách hàng',
          licenseExpiresAt: res.expiresAt || null
        })
        setActivationMsg({
          text: res.message || t('purchase.activatedSuccess', { role: activatedRole }),
          ok: true
        })
        setPaidInfo({
          key: trimmed,
          role: activatedRole,
          expiresAt: res.expiresAt ?? null,
          renewed: false,
          fromPayment: false,
          paidAt: new Date().toISOString()
        })
        setPayment('done')
        pushToast({
          id: Date.now().toString(),
          message: res.message || t('purchase.activatedSuccess', { role: activatedRole }),
          tone: 'info'
        })
      } else {
        setActivationMsg({ text: res.message || t('license.activateFailed'), ok: false })
      }
    } catch (err: any) {
      setActivationMsg({ text: t('license.connectionError', { error: err?.message || String(err) }), ok: false })
    } finally {
      setActivatingKey(false)
    }
  }

  const priceFormatted = (VIETQR_CONFIG.prices[role]).toLocaleString('vi-VN') + ' đ'
  const daysLeft = current ? getDaysRemaining(current.expiresAt) : null
  const newExpiry = current ? renewedExpiry(current.expiresAt, role) : null
  const qrUrl = order ? getVietQrImageUrl(order.amount, order.transfer_content) : ''

  const containerStyle: React.CSSProperties = isModal
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }
    : {
        maxWidth: 460,
        margin: '0 auto'
      }

  const cardStyle: React.CSSProperties = isModal
    ? {
        width: '100%',
        maxWidth: 460,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#121218',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
        borderRadius: 16,
        padding: 20
      }
    : {}

  const content = (
    <div style={cardStyle}>
      {isModal && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CrownIcon width={20} height={20} fill="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {isRenew ? t('renew.title') : t('purchase.title')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      )}

      {!order ? (
        /* Bước 1: Chọn gói và nhập Email */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'renew' && !currentLoaded && (
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>{t('renew.loading')}</div>
          )}
          {mode === 'renew' && currentLoaded && !current && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11.5,
              color: '#fcd34d'
            }}>
              {t('renew.noLicense')}
            </div>
          )}
          {isRenew && current && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.12))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 12
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>{t('renew.currentPlan')}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ color: current.role === 'PREMIUM' ? '#c084fc' : '#f59e0b', fontSize: 13.5 }}>{current.role}</strong>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {t('renew.expiresOn', { date: formatExpiryDate(current.expiresAt) })}
                  {daysLeft !== null && <span style={{ color: daysLeft <= 3 ? '#f87171' : '#7dd3fc' }}> · {t('renew.daysLeft', { days: daysLeft })}</span>}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>{current.key}</span>
            </div>
          )}

          {/* Chọn gói */}
          <div>
            <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {isRenew ? t('renew.choosePlan') : t('purchase.choosePlan')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setRole('VIP'); playButtonClickSound() }}
                style={{
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: role === 'VIP' ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: role === 'VIP' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <strong style={{ fontSize: 13.5, color: role === 'VIP' ? '#f59e0b' : '#fff' }}>{t('purchase.vipTitle')}</strong>
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 }}>
                  {isRenew ? t('renew.planSub', { days: PLAN_DAYS.VIP, price: VIETQR_CONFIG.prices.VIP.toLocaleString('vi-VN') }) : t('purchase.vipSub')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setRole('PREMIUM'); playButtonClickSound() }}
                style={{
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: role === 'PREMIUM' ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: role === 'PREMIUM' ? 'rgba(168, 85, 247, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <strong style={{ fontSize: 13.5, color: role === 'PREMIUM' ? '#c084fc' : '#fff' }}>{t('purchase.premiumTitle')}</strong>
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 }}>
                  {isRenew ? t('renew.planSub', { days: PLAN_DAYS.PREMIUM, price: VIETQR_CONFIG.prices.PREMIUM.toLocaleString('vi-VN') }) : t('purchase.premiumSub')}
                </span>
              </button>
            </div>
            {isRenew && newExpiry && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: '#6ee7b7' }}>
                {t('renew.newExpiry', { date: formatExpiryDate(newExpiry.toISOString()) })}
                {current?.role === 'PREMIUM' && role === 'VIP' && (
                  <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}> · {t('renew.keepsPremium')}</span>
                )}
              </div>
            )}
          </div>

          {/* Machine ID */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                {t('purchase.machineIdLabel')}
              </label>
              <button
                type="button"
                onClick={handleCopyMachineId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedMachineId ? '#10b981' : '#38bdf8',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {copiedMachineId ? t('purchase.copied') : t('purchase.copy')}
              </button>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
              color: '#38bdf8',
              letterSpacing: '0.05em'
            }}>
              {machineId || t('purchase.gettingMachineId')}
            </div>
          </div>

          {/* Email nhận mã */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                {t('purchase.emailLabel')}
              </label>
              <button
                type="button"
                onClick={handlePasteEmail}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {t('purchase.pasteClipboard')}
              </button>
            </div>
            <input
              ref={emailInputRef}
              type="email"
              placeholder={t('purchase.emailInputPlaceholder')}
              value={email}
              onChange={(e) => handleValidateEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateOrder()
              }}
              style={{
                width: '100%',
                height: 38,
                background: 'rgba(0, 0, 0, 0.5)',
                border: emailError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                padding: '0 12px',
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {emailError ? (
              <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>
                {emailError}
              </span>
            ) : emailPrefilled ? (
              <span style={{ fontSize: 10.5, color: '#6ee7b7', marginTop: 4, display: 'block' }}>
                {t('renew.emailPrefilled')}
              </span>
            ) : (
              <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', marginTop: 4, display: 'block' }}>
                {t('purchase.emailHelp')}
              </span>
            )}
          </div>

          {/* Quyền lợi */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 11.5,
            lineHeight: 1.55,
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            {t('purchase.benefit1')}<br />
            {t('purchase.benefit2')}<br />
            {t('purchase.benefit3')}
          </div>

          {/* Nút Tạo mã QR */}
          <button
            type="button"
            disabled={submitting || !currentLoaded}
            onClick={handleCreateOrder}
            style={{
              width: '100%',
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13.5,
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000000',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
            }}
          >
            {submitting
              ? t('purchase.creatingOrder')
              : isRenew
                ? t('renew.createOrder', { price: priceFormatted })
                : t('purchase.createOrder', { price: priceFormatted })}
          </button>
        </div>
      ) : (
        /* Bước 2: VietQR + chuyển khoản; sau khi nhận tiền thì thay bằng màn thành công */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {paidInfo ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                borderRadius: 14,
                padding: '22px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                textAlign: 'center'
              }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#10b981',
                color: '#000',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 0 24px rgba(16, 185, 129, 0.55)'
              }}>
                <CheckIcon width={30} height={30} />
              </div>
              <strong style={{ fontSize: 16, color: '#fff' }}>
                {paidInfo.renewed ? t('renew.paidTitle') : t('purchase.paidTitle')}
              </strong>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                {t('purchase.activatedDesc')}
              </span>
              <div style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.paidPlan')}</span>
                  <strong style={{ color: paidInfo.role === 'PREMIUM' ? '#c084fc' : '#f59e0b' }}>{paidInfo.role}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.paidExpiry')}</span>
                  <strong style={{ color: '#6ee7b7' }}>{formatExpiryDate(paidInfo.expiresAt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.paidKey')}</span>
                  <strong style={{ color: '#fff', fontFamily: 'var(--font-mono, monospace)' }}>{paidInfo.key}</strong>
                </div>
              </div>
              {paidInfo.fromPayment && window.edge?.saveReceipt && receiptStep === 'sign' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{t('receipt.signTitle')}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>{t('receipt.signHint')}</span>
                  <SignaturePad ref={signRef} onChange={setSignEmpty} label={t('receipt.signHere')} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="purchase-ghost-btn" onClick={() => signRef.current?.clear()} disabled={signEmpty}>
                      {t('receipt.clear')}
                    </button>
                    <button
                      type="button"
                      className="purchase-ghost-btn"
                      onClick={() => {
                        setSignature(null)
                        setReceiptStep('name')
                      }}
                    >
                      {t('receipt.skipSign')}
                    </button>
                    <button
                      type="button"
                      className="purchase-primary-btn"
                      disabled={signEmpty}
                      onClick={() => {
                        setSignature(signRef.current?.toDataUrl() ?? null)
                        setReceiptStep('name')
                        window.setTimeout(() => nameInputRef.current?.focus(), 50)
                      }}
                    >
                      {t('receipt.next')}
                    </button>
                  </div>
                </div>
              )}
              {paidInfo.fromPayment && window.edge?.saveReceipt && receiptStep === 'name' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                  {signature && (
                    <img
                      src={signature}
                      alt=""
                      style={{ width: '100%', maxHeight: 90, objectFit: 'contain', background: '#fff', borderRadius: 8 }}
                    />
                  )}
                  <label htmlFor="receipt-buyer-name" style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {t('receipt.nameLabel')}
                  </label>
                  <input
                    id="receipt-buyer-name"
                    ref={nameInputRef}
                    type="text"
                    autoComplete="name"
                    maxLength={60}
                    placeholder={t('receipt.namePlaceholder')}
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveReceipt()
                    }}
                    style={{
                      height: 36,
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: signature && !normalizeBuyerName(buyerName) ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 8,
                      padding: '0 12px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                  <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.55)' }}>
                    {signature ? t('receipt.nameHintSigned') : t('receipt.nameHintOptional')}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="purchase-ghost-btn" onClick={() => setReceiptStep('sign')}>
                      {t('receipt.back')}
                    </button>
                    <button
                      type="button"
                      className="purchase-primary-btn"
                      disabled={savingReceipt || (!!signature && !normalizeBuyerName(buyerName))}
                      onClick={() => void handleSaveReceipt()}
                    >
                      {savingReceipt ? t('purchase.receiptSaving') : t('receipt.create')}
                    </button>
                  </div>
                </div>
              )}
              {paidInfo.fromPayment && window.edge?.saveReceipt && receiptStep === 'idle' && (
                <button
                  type="button"
                  disabled={savingReceipt}
                  onClick={() => {
                    playButtonClickSound()
                    setSignature(null)
                    setSignEmpty(true)
                    setReceiptStep('sign')
                  }}
                  style={{
                    width: '100%',
                    height: 34,
                    marginTop: 4,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: savingReceipt ? 'default' : 'pointer',
                    opacity: savingReceipt ? 0.7 : 1
                  }}
                >
                  {savingReceipt ? t('purchase.receiptSaving') : t('purchase.receiptButton')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  height: 36,
                  marginTop: 4,
                  background: '#10b981',
                  border: 'none',
                  borderRadius: 8,
                  color: '#000',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {t('purchase.startUsing')}
              </button>
            </div>
          ) : (
          <>
          <div style={{ textAlign: 'center', background: '#ffffff', padding: 12, borderRadius: 12 }}>
            <img
              src={qrUrl}
              alt="VietQR Chuyển Khoản"
              style={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block', margin: '0 auto', borderRadius: 8 }}
            />
            <span style={{ fontSize: 11, color: '#666', marginTop: 6, display: 'block' }}>
              {t('purchase.scanQrHint')}
            </span>
          </div>

          {/* Bảng chi tiết chuyển khoản */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.bank')}</span>
              <strong style={{ color: '#fff' }}>{VIETQR_CONFIG.bankName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.accountNumber')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{VIETQR_CONFIG.accountNo}</strong>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: copiedStk ? '#10b981' : '#38bdf8', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    navigator.clipboard.writeText(VIETQR_CONFIG.accountNo)
                    setCopiedStk(true)
                    setTimeout(() => setCopiedStk(false), 1500)
                  }}
                >
                  {copiedStk ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.accountHolder')}</span>
              <strong style={{ color: '#fff' }}>{VIETQR_CONFIG.accountName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{t('purchase.amount')}</span>
              <strong style={{ color: '#f59e0b', fontSize: 13 }}>{order.amount.toLocaleString('vi-VN')} VNĐ</strong>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 6 }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.55)', marginBottom: 2 }}>{t('purchase.transferContent')}</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 8px',
                borderRadius: 6
              }}>
                <span style={{ color: '#fcd34d', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                  {order.transfer_content}
                </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: copiedMemo ? '#10b981' : '#f59e0b', cursor: 'pointer', padding: 0, marginLeft: 6 }}
                  onClick={() => {
                    navigator.clipboard.writeText(order.transfer_content)
                    setCopiedMemo(true)
                    setTimeout(() => setCopiedMemo(false), 1500)
                  }}
                >
                  {copiedMemo ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Thông báo */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 8,
            padding: 10,
            fontSize: 11.5,
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.45
          }}>
            {payment === 'waiting' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="purchase-pulse" aria-hidden />
                {t('renew.waitingPayment')}
              </span>
            ) : (
              t('purchase.transferNotice')
            )}
          </div>

          </>
          )}

          {/* Nhập mã kích hoạt nhanh: luôn hiện, kể cả sau khi thanh toán thành công */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                {t('purchase.hasKeyLabel')}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={inlineKeyInputRef}
                  type="text"
                  placeholder={t('purchase.keyPlaceholder')}
                  value={inlineKey}
                  onChange={(e) => setInlineKey(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    height: 32,
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    padding: '0 8px',
                    color: '#fff',
                    fontSize: 11.5,
                    fontFamily: 'var(--font-mono, monospace)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  disabled={activatingKey || !inlineKey.trim()}
                  onClick={handleActivateInlineKey}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#10b981',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: 11.5,
                    cursor: activatingKey || !inlineKey.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {activatingKey ? '...' : t('purchase.activateBtn')}
                </button>
              </div>
              {activationMsg && !activationMsg.ok && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>
                  {activationMsg.text}
                </span>
              )}
            </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            {t('purchase.closeWindow')}
          </button>
        </div>
      )}
    </div>
  )

  if (isModal) {
    return <div style={containerStyle} onClick={onClose}><div onClick={(e) => e.stopPropagation()}>{content}</div></div>
  }

  return <div style={containerStyle}>{content}</div>
}
