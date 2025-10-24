import { Connection, Keypair, Transaction, TransactionInstruction } from '@solana/web3.js'
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

  const transaction = new Transaction()
  instructions.forEach((ix) => transaction.add(ix))
  transaction.feePayer = wallet.publicKey

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash

  let txId: string
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const walletAny = wallet as any
  if (walletAny.signAndSendTransaction) {
    const result = await walletAny.signAndSendTransaction(transaction)
    txId = result.signature
  } else if (wallet.signTransaction) {
    const signedTx = await wallet.signTransaction(transaction)
    txId = await connection.sendRawTransaction(signedTx.serialize())
  } else {
    throw new Error('Wallet does not support transaction signing')
  }

  await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight })
  return txId
}
