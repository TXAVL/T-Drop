/**
 * PurchaseModal — VietQR Payment & Key Order Flow.
 * Automatically saves order to Supabase tdrop_orders before rendering VietQR code.
 */
import { useState, useCallback } from 'react'
import {
  SUPABASE_CONFIG,
  VIETQR_CONFIG,
  isValidEmailDomain,
  getVietQrImageUrl,
  type TdropOrder
} from '../../shared/license'
import { playButtonClickSound } from '../lib/soundEffects'
import { useStore } from '../store/appStore'
import { CloseIcon, CopyIcon, CheckIcon, CrownIcon } from './icons'

interface PurchaseModalProps {
  open: boolean
  onClose: () => void
  machineId: string
}

export function PurchaseModal({ open, onClose, machineId }: PurchaseModalProps) {
  const [role, setRole] = useState<'VIP' | 'PREMIUM'>('VIP')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<TdropOrder | null>(null)
  const [copiedStk, setCopiedStk] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)

  const pushToast = useStore((s) => s.pushToast)

  const handleValidateEmail = (val: string) => {
    setEmail(val)
    if (!val.trim()) {
      setEmailError('Vui lòng nhập địa chỉ email')
    } else if (!isValidEmailDomain(val)) {
      setEmailError('Chỉ chấp nhận email: @gmail.com, @icloud.com, @outlook.com, @hotmail.com')
    } else {
      setEmailError('')
    }
  }

  const handleCreateOrder = useCallback(async () => {
    if (!email.trim() || !isValidEmailDomain(email)) {
      setEmailError('Chỉ chấp nhận email: @gmail.com, @icloud.com, @outlook.com, @hotmail.com')
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
      // 1. Lưu đơn hàng lên CSDL Supabase trước khi tạo mã QR
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
          message: 'Không thể tạo đơn hàng trên máy chủ. Vui lòng thử lại!',
          tone: 'error'
        })
        return
      }

      setOrder(newOrder)
      pushToast({
        id: Date.now().toString(),
        message: 'Đã tạo đơn hàng thành công! Vui lòng quét mã QR để chuyển khoản.',
        tone: 'info'
      })
    } catch (err: any) {
      console.error('[Purchase] Order creation error:', err)
      pushToast({
        id: Date.now().toString(),
        message: `Lỗi kết nối: ${err?.message || String(err)}`,
        tone: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }, [email, role, machineId, pushToast])

  if (!open) return null

  const priceFormatted = (VIETQR_CONFIG.prices[role]).toLocaleString('vi-VN') + ' đ'
  const qrUrl = order ? getVietQrImageUrl(order.amount, order.transfer_content) : ''

  return (
    <div className="txa-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="txa-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(18, 18, 22, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          borderRadius: 16,
          padding: 20,
          color: '#ffffff'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CrownIcon width={20} height={20} fill="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
              Nâng cấp T-Drop VIP & PREMIUM
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

        {!order ? (
          /* Bước 1: Chọn gói và nhập Email */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Chọn gói */}
            <div>
              <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                CHỌN GÓI BẢN QUYỀN
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className={`pill ${role === 'VIP' ? 'active' : ''}`}
                  onClick={() => { setRole('VIP'); playButtonClickSound() }}
                  style={{
                    height: 52,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: role === 'VIP' ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: role === 'VIP' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)'
                  }}
                >
                  <strong style={{ fontSize: 13, color: role === 'VIP' ? '#f59e0b' : '#fff' }}>GÓI VIP</strong>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' }}>30 Ngày · 29.000đ</span>
                </button>

                <button
                  type="button"
                  className={`pill ${role === 'PREMIUM' ? 'active' : ''}`}
                  onClick={() => { setRole('PREMIUM'); playButtonClickSound() }}
                  style={{
                    height: 52,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: role === 'PREMIUM' ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: role === 'PREMIUM' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.04)'
                  }}
                >
                  <strong style={{ fontSize: 13, color: role === 'PREMIUM' ? '#c084fc' : '#fff' }}>GÓI PREMIUM</strong>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' }}>60 Ngày · 49.000đ</span>
                </button>
              </div>
            </div>

            {/* Machine ID */}
            <div>
              <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                MÃ MÁY ĐƯỢC KÍCH HOẠT (MACHINE ID)
              </label>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#38bdf8',
                letterSpacing: '0.05em'
              }}>
                {machineId || 'Đang lấy mã máy...'}
              </div>
              <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2, display: 'block' }}>
                Key sẽ được khóa chặt vào mã máy này để đảm bảo an toàn.
              </span>
            </div>

            {/* Email nhận mã */}
            <div>
              <label style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                EMAIL NHẬN MÃ BẢN QUYỀN
              </label>
              <input
                type="email"
                placeholder="vd: tenban@gmail.com (hoặc icloud, outlook)"
                value={email}
                onChange={(e) => handleValidateEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: emailError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '0 12px',
                  color: '#ffffff',
                  fontSize: 12.5,
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
                  Hệ thống chỉ chấp nhận: @gmail.com, @icloud.com, @outlook.com, @hotmail.com
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
              lineHeight: 1.5,
              color: 'rgba(255, 255, 255, 0.75)'
            }}>
              ✓ Mở khóa AI OCR trích xuất chữ tiếng Việt & tiếng Anh từ ảnh.<br />
              ✓ Không giới hạn số lần sử dụng trong thời gian hiệu lực.<br />
              ✓ Đơn hàng được lưu trên CSDL; Admin kích hoạt và gửi key về mail ngay sau khi nhận tiền.
            </div>

            {/* Nút Tạo mã QR */}
            <button
              type="button"
              className="pill active"
              disabled={submitting || Boolean(emailError) || !email.trim()}
              onClick={handleCreateOrder}
              style={{
                width: '100%',
                height: 38,
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000'
              }}
            >
              {submitting ? 'Đang tạo đơn hàng...' : `Thanh toán ${priceFormatted} qua VietQR`}
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
                Quét mã bằng ứng dụng Ngân hàng bất kỳ để tự động điền STK & số tiền
              </span>
            </div>

            {/* Bảng chi tiết chuyển khoản */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 10,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Ngân hàng:</span>
                <strong style={{ color: '#fff' }}>{VIETQR_CONFIG.bankName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Số tài khoản:</span>
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
                <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Chủ tài khoản:</span>
                <strong style={{ color: '#fff' }}>{VIETQR_CONFIG.accountName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>Số tiền:</span>
                <strong style={{ color: '#f59e0b', fontSize: 13 }}>{order.amount.toLocaleString('vi-VN')} VNĐ</strong>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 6 }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.55)', marginBottom: 2 }}>Nội dung chuyển khoản (bắt buộc đúng):</div>
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
              📧 Đơn hàng <strong>{order.order_code}</strong> đã được lưu. Sau khi bạn chuyển khoản, Admin sẽ duyệt và gửi mã kích hoạt trực tiếp vào email <strong>{order.email}</strong>.
            </div>

            <button
              type="button"
              className="pill active"
              onClick={onClose}
              style={{ width: '100%', height: 34, justifyContent: 'center', fontSize: 12 }}
            >
              Tôi đã chuyển khoản xong (Đóng)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
