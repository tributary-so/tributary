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

  const txId = await wallet.sendTransaction(transaction, connection)

  await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight })
  return txId
}
