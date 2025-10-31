import { Connection, Transaction, TransactionInstruction } from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { RecurringPaymentsSDK } from '@tributary-so/sdk'
import { Wallet } from '@coral-xyz/anchor'

/**
 * Hook-like function to get SDK instance
 * Use this in React components to get the SDK
 */
export function useSDK(wallet: WalletContextState, connection: Connection) {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  return new RecurringPaymentsSDK(connection, wallet as any as Wallet)
}

declare global {
  interface Window {
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    solana?: any
    phantom?: {
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      solana?: any
    }
  }
}

/**
 * Creates a transaction from instructions, signs it, sends it, and confirms it
 * Handles both desktop (signTransaction) and mobile (signAndSendTransaction) flows
 */
export async function createAndSendTransaction(
  instructions: TransactionInstruction[],
  wallet: WalletContextState,
  connection: Connection,
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected')
  }

  // Check if mobile browser without injected wallet
  const isMobile = /Android|iPhone/i.test(navigator.userAgent)

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const hasInjectedWallet = window.solana || (window as any).phantom?.solana

  if (isMobile && !hasInjectedWallet) {
    // Redirect to Phantom browser
    const dappUrl = encodeURIComponent(window.location.href)
    window.location.href = `https://phantom.app/ul/browse/${dappUrl}`
    throw new Error('Redirecting to Phantom...')
  }

  console.log(wallet)
  console.log(connection)
  const transaction = new Transaction()
  instructions.forEach((ix) => transaction.add(ix))
  transaction.feePayer = wallet.publicKey

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash

  console.log(transaction)
  const txId = await wallet.sendTransaction(transaction, connection)

  await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight })
  return txId
}
