/**
 * Gateway merchant layer API client + JWT store.
 *
 * Auth flow (ADR-0026):
 *   1. POST /v1/gateway/:g/auth/challenge → nonce
 *   2. wallet.signMessage(nonce bytes)
 *   3. POST /v1/gateway/:g/auth/verify { signer, signature } → JWT
 *   4. Cache JWT in-memory; attach as Bearer to merchant fetches
 *
 * Ponytail: in-memory token. Survives navigations within the SPA, dies on
 * reload. That's the right ceiling — sensitive token, short TTL (15min),
 * re-signing is one click.
 */

import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { MERCHANT_API_BASE } from '../constants'

type Maybe<T> = T | null

let cachedToken: Maybe<{ token: string; gateway: string; expiresAt: number }> = null

interface ChallengeResponse {
  nonce: string
  gateway: string
  expiresAt: number
}
interface VerifyResponse {
  token: string
  expiresIn: number
}

function base(gateway: string): string {
  return `${MERCHANT_API_BASE}/v1/gateway/${gateway}`
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Trigger the full challenge → sign → verify flow for the given gateway.
 * Caches the resulting JWT and returns it.
 */
export async function authenticateGateway(
  gateway: string,
  signer: { publicKey: string; signMessage: (msg: Uint8Array) => Promise<Uint8Array | number[]> },
): Promise<string> {
  const challenge = await postJson<ChallengeResponse>(`${base(gateway)}/auth/challenge`, {})
  const msg = new TextEncoder().encode(challenge.nonce)
  const sig = await signer.signMessage(msg)
  const signature = Array.from(sig instanceof Uint8Array ? sig : new Uint8Array(sig))
  const verify = await postJson<VerifyResponse>(`${base(gateway)}/auth/verify`, {
    signer: signer.publicKey,
    signature,
  })
  cachedToken = {
    token: verify.token,
    gateway,
    // 30s grace before the server-side exp kicks in
    expiresAt: Date.now() + verify.expiresIn * 1000 - 30_000,
  }
  return verify.token
}

export function clearGatewayToken() {
  cachedToken = null
}

function authHeaders(): Record<string, string> {
  if (!cachedToken) return {}
  if (Date.now() > cachedToken.expiresAt) {
    cachedToken = null
    return {}
  }
  return { Authorization: `Bearer ${cachedToken.token}` }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${path}`, { headers: authHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Public API types (mirror apps/api/src/db/merchant.ts) ────────────────

export interface MerchantPolicy {
  policyAddress: string
  family: 'regular' | 'composable'
  policyId: number
  recipient: string
  userPayment: string
  variant: string
  status: 'Active' | 'Paused' | 'Deleted'
  amount: string | null
  paymentFrequency: string | null
  createdAt: number
  paymentCount: number
  totalPaid: string
  lastPaymentAt: number | null
}

export interface MerchantSubscriber {
  wallet: string
  policyCount: number
  totalPaid: string
  lastActiveAt: number | null
}

export interface MerchantRevenue {
  mrr: string
  recognizedRevenue: string
  activeSubscriptionCount: number
  series: Array<{ ts: string; mrr: string; recognized: string }>
}

export interface Paginated<T> {
  items: T[]
  total: number
}

// ─── Endpoint helpers ─────────────────────────────────────────────────────

export const merchantApi = {
  policies: (g: string, opts?: { limit?: number; offset?: number }) =>
    getJson<Paginated<MerchantPolicy>>(`${base(g)}/merchant/policies?${qs(opts)}`),
  subscribers: (g: string, opts?: { limit?: number; offset?: number }) =>
    getJson<Paginated<MerchantSubscriber>>(`${base(g)}/merchant/subscribers?${qs(opts)}`),
  revenue: (g: string, opts?: { bucket?: 'day' | 'week' }) =>
    getJson<MerchantRevenue>(`${base(g)}/merchant/revenue?${qs(opts)}`),
  exportUrl: (g: string, kind: 'policies' | 'subscribers' | 'revenue' | 'payments') =>
    `${base(g)}/merchant/export/${kind}?format=csv`,
}

function qs(opts?: Record<string, unknown>): string {
  if (!opts) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(opts)) {
    if (v !== undefined && v !== null) sp.set(k, String(v))
  }
  const s = sp.toString()
  return s
}

// ─── React hook: useMerchantAuth ──────────────────────────────────────────

export interface MerchantAuthState {
  authenticated: boolean
  token: Maybe<string>
  signingIn: boolean
  error: Maybe<string>
  signIn: () => Promise<void>
  signOut: () => void
}

/**
 * Drives the challenge/sign/verify flow with the connected wallet. The
 * gateway arg comes from the page-level useGatewayAuthority hook.
 */
export function useMerchantAuth(gateway: Maybe<string>): MerchantAuthState {
  const wallet = useWallet()
  const [token, setToken] = useState<Maybe<string>>(cachedToken?.token ?? null)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<Maybe<string>>(null)

  useEffect(() => {
    // If the gateway changes, drop any stale cached token.
    if (cachedToken && cachedToken.gateway !== gateway) clearGatewayToken()
    setToken(cachedToken?.token ?? null)
  }, [gateway])

  const signIn = useCallback(async () => {
    if (!gateway || !wallet.publicKey || !wallet.signMessage) {
      setError('Wallet does not support message signing')
      return
    }
    setSigningIn(true)
    setError(null)
    try {
      const t = await authenticateGateway(gateway, {
        publicKey: wallet.publicKey.toString(),
        signMessage: wallet.signMessage,
      })
      setToken(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setSigningIn(false)
    }
  }, [gateway, wallet.publicKey, wallet.signMessage])

  const signOut = useCallback(() => {
    clearGatewayToken()
    setToken(null)
  }, [])

  return {
    authenticated: !!token,
    token,
    signingIn,
    error,
    signIn,
    signOut,
  }
}
