import { Connection, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { Tributary, type IWallet } from '@tributary-so/sdk'


/**
 * Hook-like function to get SDK instance
 * Use this in React components to get the SDK
 */
export function useSDK(wallet: WalletContextState, connection: Connection) {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  return new Tributary(connection, wallet as any as IWallet)
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
  if (!wallet.signTransaction) {
    throw new Error('Missing wallet.signTransaction!')
  }
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: instructions,
  }).compileToV0Message()
  const transaction = new VersionedTransaction(messageV0)
  const signedTx = await wallet.signTransaction(transaction)
  const txId = await connection.sendRawTransaction(
    signedTx.serialize(),
    // The actual bug is that sendTransaction is being called without {
    // skipPreflight: true }, and the default RPC behavior with Connection
    // (commitment "processed" from line 119) can cause the transaction to be
    // submitted, then the connection internally retries it.
    { skipPreflight: true },
  )
  await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight })
  return txId
}
