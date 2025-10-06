import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardHeader, CardBody, Button, Input } from '@heroui/react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useSDK } from '@/lib/client'
import { toast } from 'sonner'

export default function GatewayFeature() {
  const [gatewayFeeBps, setGatewayFeeBps] = useState('')
  const [gatewayFeeRecipient, setGatewayFeeRecipient] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)

  const handleSubmit = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error('Wallet not connected')
      return
    }

    if (!sdk) {
      toast.error('SDK not available')
      return
    }

    try {
      setIsLoading(true)

      // Validate inputs
      const feeBps = parseInt(gatewayFeeBps)
      if (isNaN(feeBps) || feeBps < 0 || feeBps > 10000) {
        toast.error('Fee basis points must be between 0 and 10000')
        return
      }

      let feeRecipient: PublicKey
      try {
        feeRecipient = new PublicKey(gatewayFeeRecipient)
      } catch {
        toast.error('Invalid fee recipient address')
        return
      }

      // Create the instruction
      const instruction = await sdk.createPaymentGateway(feeBps, feeRecipient)

      // Create and send transaction
      const { Transaction } = await import('@solana/web3.js')
      const transaction = new Transaction().add(instruction)
      transaction.feePayer = wallet.publicKey

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      const signedTx = await wallet.signTransaction(transaction)
      const txId = await connection.sendRawTransaction(signedTx.serialize())

      await connection.confirmTransaction({
        signature: txId,
        blockhash,
        lastValidBlockHeight,
      })

      toast.success(`Payment gateway created! Transaction: ${txId}`)

      // Reset form
      setGatewayFeeBps('')
      setGatewayFeeRecipient('')
    } catch (error) {
      console.error('Error creating payment gateway:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create payment gateway')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Create Payment Gateway</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-4">
              <Input
                label="Gateway Fee (basis points)"
                placeholder="100"
                value={gatewayFeeBps}
                onChange={(e) => setGatewayFeeBps(e.target.value)}
                description="Fee in basis points (1 bp = 0.01%). Max 10000 (100%)"
                type="number"
                min="0"
                max="10000"
              />
              <Input
                label="Fee Recipient Address"
                placeholder="Enter Solana wallet address"
                value={gatewayFeeRecipient}
                onChange={(e) => setGatewayFeeRecipient(e.target.value)}
                description="Wallet address that will receive the gateway fees"
              />
              <Button
                color="primary"
                onPress={handleSubmit}
                isLoading={isLoading}
                isDisabled={!wallet.connected || !gatewayFeeBps || !gatewayFeeRecipient}
                className="mt-4"
              >
                Create Gateway
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
