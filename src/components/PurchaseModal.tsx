/**
 * PurchaseModal & PurchaseWindowView — VietQR Payment & Key Order Flow.
 * Automatically saves order to Supabase tdrop_orders before rendering VietQR code.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SUPABASE_CONFIG,
  VIETQR_CONFIG,
  isValidEmailDomain,
  getVietQrImageUrl,
  type TdropOrder
} from '../../shared/license'
import { playButtonClickSound } from '../lib/soundEffects'
import { useStore } from '../store/appStore'
import { t } from '../i18n'
import { CloseIcon, CopyIcon, CheckIcon, CrownIcon } from './icons'
import { ToastStack } from './Toast'

interface PurchaseModalProps {
  open: boolean
  onClose: () => void
  machineId?: string
}

export function PurchaseModal({ open, onClose, machineId: propMachineId }: PurchaseModalProps) {
  if (!open) return null
  return <PurchaseWindowContent onClose={onClose} initialMachineId={propMachineId} isModal={true} />
}

export function PurchaseWindowView() {
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
          <span>T-Drop — Nâng Cấp Bản Quyền VIP & PREMIUM</span>
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
        <PurchaseWindowContent onClose={handleClose} isModal={false} />
      </div>
    </div>
  )
}

function PurchaseWindowContent({
  onClose,
  initialMachineId,
  isModal = false
}: {
  onClose: () => void
  initialMachineId?: string
  isModal?: boolean
}) {
  const [role, setRole] = useState<'VIP' | 'PREMIUM'>('VIP')
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
    if (!machineId && window.edge?.getLicenseDeviceInfo) {
      window.edge.getLicenseDeviceInfo().then((info) => {
        if (info?.hwHash) setMachineId(info.hwHash)
      }).catch(console.error)
    }
  }, [machineId])

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
    const transferContent = `Thanh toan ${role} cho machine ID: ${machineId || 'UNKNOWN'}`

    const newOrder: TdropOrder = {
      order_code: orderCode,
      machine_id: machineId || 'UNKNOWN',
      role,
      amount,
      email: email.trim().toLowerCase(),
      transfer_content: transferContent,
      status: 'pending'
    }

    try {
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/tdrop_orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.publishableKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.publishableKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newOrder)
      })

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
  }, [email, role, machineId, pushToast])

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
        pushToast({
          id: Date.now().toString(),
          message: res.message || t('purchase.activatedSuccess', { role: activatedRole }),
          tone: 'info'
        })
        setTimeout(() => {
          onClose()
        }, 1800)
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
              {t('purchase.title')}
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
          {/* Chọn gói */}
          <div>
            <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {t('purchase.choosePlan')}
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
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 }}>{t('purchase.vipSub')}</span>
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
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 }}>{t('purchase.premiumSub')}</span>
              </button>
            </div>
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
            disabled={submitting}
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
            {submitting ? t('purchase.creatingOrder') : t('purchase.createOrder', { price: priceFormatted })}
          </button>
        </div>
      ) : (
        /* Bước 2: Hiển thị VietQR và thông tin chuyển khoản */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            {t('purchase.transferNotice')}
          </div>

          {/* Nhập mã kích hoạt nhanh */}
          {activationMsg?.ok ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CrownIcon width={18} height={18} fill="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                  {activationMsg.text}
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.8)' }}>
                {t('purchase.activatedDesc')}
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 32,
                  background: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  color: '#000',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: 4
                }}
              >
                {t('purchase.startUsing')}
              </button>
            </div>
          ) : (
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
          )}

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
