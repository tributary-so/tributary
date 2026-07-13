import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useSDK } from '@/lib/client'
import type { PaymentGateway } from '@tributary-so/sdk'

export interface GatewayAuthorityState {
  gateway: PaymentGateway | null
  gatewayPda: PublicKey | null
  authority: PublicKey | null
  isAuthority: boolean
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Single deterministic authority check: derive the gateway PDA from the
 * connected wallet and fetch that one account. Returns the gateway account
 * when the wallet is its authority, otherwise null. Used by both the
 * `/gateways` banner and the `/gateway/manage` guard — no `getAllPaymentGateway`
 * scan, exactly one RPC call.
 */
export function useGatewayAuthority(): GatewayAuthorityState {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [gateway, setGateway] = useState<PaymentGateway | null>(null)
  const [gatewayPda, setGatewayPda] = useState<PublicKey | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!sdk || !wallet.publicKey) {
      setGateway(null)
      setGatewayPda(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { address } = sdk.getGatewayPda(wallet.publicKey)
      setGatewayPda(address)
      const account = await sdk.getPaymentGateway(address)
      if (account && account.authority.toString() === wallet.publicKey.toString()) {
        setGateway(account)
      } else {
        setGateway(null)
      }
    } catch (err) {
      console.error('useGatewayAuthority: fetch failed', err)
      setGateway(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk, wallet.publicKey?.toString()])

  return {
    gateway,
    gatewayPda,
    authority: wallet.publicKey ?? null,
    isAuthority: gateway !== null,
    loading,
    refresh,
  }
}
