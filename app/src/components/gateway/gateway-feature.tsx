import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardHeader, CardBody, Button, Input } from '@heroui/react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useSDK } from '@/lib/client'
import { toast } from 'sonner'
import { PaymentGatewayList } from './payment-gateway-list'

export default function GatewayFeature() {
  const [gatewayFeeBps, setGatewayFeeBps] = useState('')
  const [gatewayFeeRecipient, setGatewayFeeRecipient] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)

  useEffect(() => {
    setGatewayFeeRecipient(wallet?.publicKey?.toString() || '')
  }, [wallet])

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

      const instruction = await sdk.createPaymentGateway(feeBps, feeRecipient)

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
    <div 
      style={{
        width: '100%',
        backgroundColor: '#fff',
        fontFamily: 'var(--font-primary)',
        paddingTop: '40px',
        paddingBottom: '40px',
        flex: 1,
      }}
    >
      <div className="max-w-[1440px] mx-auto px-[40px]">
        <div 
          className="border-r border-l border-[var(--color-primary)]"
          style={{
            padding: '32px',
            minHeight: '500px',
          }}
        >
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-secondary)' }}>
                Create Payment Gateway
              </h2>
              <p className="text-sm text-gray-600">
                Set up a payment gateway to process subscription payments with a custom fee structure.
              </p>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Gateway Configuration</h3>
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
                    placeholder={wallet?.publicKey?.toString() || 'Enter Solana wallet address'}
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
                    style={{
                      fontFamily: 'var(--font-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Create Gateway
                  </Button>
                </div>
              </CardBody>
            </Card>

            <div className="mt-8">
              <PaymentGatewayList />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}