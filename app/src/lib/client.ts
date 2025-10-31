import {
  Connection,
  // Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
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
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

  console.log(`Wallet:`, wallet)
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: instructions,
  }).compileToV0Message()
  const transaction = new VersionedTransaction(messageV0)

  // const txId = await wallet.sendTransaction(transaction, connection)
  //
  console.log(`Unsigned Transaction`, transaction)
  if (!wallet.signTransaction) {
    throw new Error('Missing wallet.signTransaction!')
  }
  const signedTx = await wallet.signTransaction(transaction)

  console.log(`Signed Transaction: `, signedTx)
  const txId = await connection.sendTransaction(signedTx)

  await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight })
  return txId
}
