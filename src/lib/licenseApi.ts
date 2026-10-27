/**
 * Read-only license RPCs used by the checkout window.
 *
 * Both return null when the server does not have the RPC (migration not applied
 * yet) or is unreachable, so callers degrade to the manual flow instead of erroring.
 */
import { SUPABASE_CONFIG } from '../../shared/license'

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_CONFIG.publishableKey,
        Authorization: `Bearer ${SUPABASE_CONFIG.publishableKey}`
      },
      body: JSON.stringify(args)
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export interface RenewalInfo {
  ok: boolean
  email?: string | null
  role?: string
  expires_at?: string | null
  status?: string
}

/** Email + plan on file for this key, only if the key is bound to this machine. */
export function fetchRenewalInfo(key: string, hwHash: string): Promise<RenewalInfo | null> {
  return rpc<RenewalInfo>('tdrop_renewal_info', { p_key: key, p_hw_hash: hwHash })
}

export interface OrderStatus {
  ok: boolean
  status: 'pending' | 'approved' | 'rejected' | 'not_found'
  license_key?: string | null
  renewed?: boolean
  expires_at?: string | null
}

/** Status of an order this machine created; the key is only returned to that machine. */
export function fetchOrderStatus(orderCode: string, machineId: string): Promise<OrderStatus | null> {
  return rpc<OrderStatus>('tdrop_order_status', { p_order_code: orderCode, p_machine_id: machineId })
}
