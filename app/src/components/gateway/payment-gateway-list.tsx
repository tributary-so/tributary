import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
} from '@heroui/react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useSDK } from '@/lib/client'
import { PublicKeyComponent } from '@/components/ui/public-key'
import { toast } from 'sonner'
import type { PaymentGateway } from '../../../../sdk/src'
import { PublicKey } from '@solana/web3.js'

interface PaymentGatewayData {
  publicKey: PublicKey
  account: PaymentGateway
}

export function PaymentGatewayList() {
  const [gateways, setGateways] = useState<PaymentGatewayData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)

  useEffect(() => {
    const fetchGateways = async () => {
      if (!sdk || hasLoaded) {
        return
      }

      try {
        setIsLoading(true)
        const gatewayData = await sdk.getAllPaymentGateway()
        setGateways(gatewayData)
        setHasLoaded(true)
      } catch (error) {
        console.error('Error fetching payment gateways:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to fetch payment gateways')
      } finally {
        setIsLoading(false)
      }
    }

    if (sdk && !hasLoaded) {
      fetchGateways()
    }
  }, [sdk, hasLoaded])

  const formatFeeBps = (feeBps: number) => {
    return `${feeBps} bps (${(feeBps / 100).toFixed(2)}%)`
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Payment Gateways</h2>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Spinner />
          </div>
        ) : gateways.length === 0 ? (
          <div className="text-center p-4 text-gray-500">No payment gateways found</div>
        ) : (
          <Table aria-label="Payment gateways table">
            <TableHeader>
              <TableColumn>GATEWAY ADDRESS</TableColumn>
              <TableColumn>AUTHORITY</TableColumn>
              <TableColumn>FEE RECIPIENT</TableColumn>
              <TableColumn>FEE RATE</TableColumn>
            </TableHeader>
            <TableBody>
              {gateways.map((gateway, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <PublicKeyComponent publicKey={gateway.publicKey} />
                  </TableCell>
                  <TableCell>
                    <PublicKeyComponent publicKey={gateway.account.authority} />
                  </TableCell>
                  <TableCell>
                    <PublicKeyComponent publicKey={gateway.account.feeRecipient} />
                  </TableCell>
                  <TableCell>{formatFeeBps(gateway.account.gatewayFeeBps)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardBody>
    </Card>
  )
}
