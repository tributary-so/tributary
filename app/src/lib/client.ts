import { Connection, Keypair } from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { RecurringPaymentsSDK } from '@tributary-so/sdk'
import { Wallet } from '@coral-xyz/anchor'

/**
 * Creates a new instance of the RecurringPayments SDK
 * Returns null if wallet is not connected
 */
export function createSDK(wallet: WalletContextState, connection: Connection): RecurringPaymentsSDK | null {
  let anchorWallet
  if (!wallet.publicKey || !wallet.signTransaction) {
    anchorWallet = {
      publicKey: Keypair.generate().publicKey,
    }
  } else {
    anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    }
  }

  // Create wallet adapter compatible with Anchor

  return new RecurringPaymentsSDK(connection, anchorWallet as Wallet)
}

/**
 * Hook-like function to get SDK instance
 * Use this in React components to get the SDK
 */
export function useSDK(wallet: WalletContextState, connection: Connection) {
  return createSDK(wallet, connection)
}
