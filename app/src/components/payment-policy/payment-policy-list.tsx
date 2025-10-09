import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Spinner, Button } from '@heroui/react'
import { Alert, AlertDescription } from '../ui/alert'
import { useSDK } from '@/lib/client'
import type { PaymentPolicy, UserPayment, PaymentGateway } from '@tributary/sdk'
import { PublicKeyComponent } from '@/components/ui/public-key'
import { formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns'
import { Play } from 'lucide-react'
import { toast } from 'sonner'

interface UserPaymentWithPolicies {
  userPaymentAddress: PublicKey
  userPayment: UserPayment
  policies: Array<{ publicKey: PublicKey; account: PaymentPolicy }>
}

export default function PaymentPolicyList() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userPayments, setUserPayments] = useState<UserPaymentWithPolicies[]>([])
  const [executingPayments, setExecutingPayments] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchPolicies = async () => {
      if (!sdk) {
        setLoading(false)
        return
      }
      if (loaded) return
      try {
        setLoading(true)
        setError(null)
        const allPolicies = await sdk.getAllPaymentPolicies()

        const userPaymentMap = new Map<string, UserPaymentWithPolicies>()

        for (const policy of allPolicies) {
          const userPaymentAddress = policy.account.userPayment.toString()

          if (!userPaymentMap.has(userPaymentAddress)) {
            const userPayment = await sdk.getUserPayment(policy.account.userPayment)
            if (userPayment) {
              userPaymentMap.set(userPaymentAddress, {
                userPaymentAddress: policy.account.userPayment,
                userPayment,
                policies: [],
              })
            }
          }

          const entry = userPaymentMap.get(userPaymentAddress)
          if (entry) {
            entry.policies.push(policy)
          }
        }

        setUserPayments(Array.from(userPaymentMap.values()))
        setLoaded(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment policies'
        setError(errorMessage)
        console.error('Error fetching payment policies:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicies()
  }, [sdk, loaded])

  const getPolicyType = (policy: PaymentPolicy) => {
    const policyType = policy.policyType as Record<string, unknown>
    if (policyType.subscription) {
      return 'Subscription'
    } else if (policyType.oneTime) {
      return 'One Time'
    } else if (policyType.installment) {
      return 'Installment'
    }
    return 'Unknown'
  }

  const getInterval = (policy: PaymentPolicy) => {
    const policyType = policy.policyType as Record<string, unknown>
    let intervalSeconds = 0

    if (policyType.subscription) {
      intervalSeconds = Number((policyType.subscription as Record<string, unknown>).intervalSeconds)
    } else if (policyType.installment) {
      intervalSeconds = Number((policyType.installment as Record<string, unknown>).intervalSeconds)
    }

    if (intervalSeconds === 0) return 'N/A'

    const duration = intervalToDuration({ start: 0, end: intervalSeconds * 1000 })
    return formatDuration(duration, { format: ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'] })
  }

  const getNextPaymentDue = (policy: PaymentPolicy) => {
    const nextPaymentDue = policy.nextPaymentDue
    if (!nextPaymentDue) return 'N/A'

    const nextPaymentDate = new Date(nextPaymentDue.toNumber() * 1000)
    const now = new Date()

    if (nextPaymentDate < now) {
      return 'Overdue'
    }

    return formatDistanceToNow(nextPaymentDate, { addSuffix: true })
  }

  const getMemo = (policy: PaymentPolicy) => {
    if (!policy.memo || policy.memo.length === 0) return ''
    try {
      const decoder = new TextDecoder()
      const filteredMemo = policy.memo.filter((byte: number) => byte !== 0)
      return decoder.decode(new Uint8Array(filteredMemo))
    } catch {
      return ''
    }
  }

  const getStatus = (policy: PaymentPolicy) => {
    const status = policy.status as Record<string, unknown>
    if (status.active) return 'Active'
    if (status.paused) return 'Paused'
    if (status.cancelled) return 'Cancelled'
    if (status.completed) return 'Completed'
    if (status.failed) return 'Failed'
    return 'Unknown'
  }

  const isPaymentDue = (policy: PaymentPolicy): boolean => {
    const nextPaymentDue = policy.nextPaymentDue
    if (!nextPaymentDue) return false

    const nextPaymentDate = new Date(nextPaymentDue.toNumber() * 1000)
    const now = new Date()

    return nextPaymentDate <= now
  }

  const handleExecutePayment = async (policyPublicKey: PublicKey, policy: PaymentPolicy) => {
    if (!sdk || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return
    }

    try {
      const gateway: PaymentGateway | null = await sdk.getPaymentGateway(policy.gateway)

      if (!gateway) {
        toast.error('Gateway not found')
        return
      }

      if (gateway.authority.toString() !== wallet.publicKey.toString()) {
        toast.error('Only the gateway authority can execute payments')
        return
      }

      setExecutingPayments((prev) => new Set(prev).add(policyPublicKey.toString()))

      const tx = new Transaction()
      const executeIxs = await sdk.executePayment(policyPublicKey)
      executeIxs.map((instruction) => tx.add(instruction))
      await sdk.provider.sendAndConfirm(tx)

      toast.success(`Payment executed successfully! TX: ${tx}`)

      setLoaded(false)
    } catch (err) {
      console.error('Error executing payment:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to execute payment')
    } finally {
      setExecutingPayments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(policyPublicKey.toString())
        return newSet
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {loading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <Spinner size="lg" />
            <span className="ml-4 text-gray-600">Loading payment policies...</span>
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && userPayments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No payment policies found</p>
            <p className="text-gray-500 mt-2">Create your first payment policy to get started</p>
          </div>
        )}

        {!loading && !error && userPayments.length > 0 && (
          <div className="w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">User Payments & Policies</h2>
              <p className="text-gray-600">View all user payment accounts and their associated policies</p>
            </div>

            {userPayments.map(({ userPaymentAddress, userPayment, policies }) => (
              <div key={userPaymentAddress.toString()} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 p-4">
                  <h3 className="text-lg font-semibold mb-3">User Payment Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Address</div>
                      <div className="font-mono text-sm mt-1">
                        <PublicKeyComponent publicKey={userPaymentAddress} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Owner</div>
                      <div className="font-mono text-sm mt-1">
                        <PublicKeyComponent publicKey={userPayment.owner} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Token Mint</div>
                      <div className="font-mono text-sm mt-1">
                        <PublicKeyComponent publicKey={userPayment.tokenMint} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Active Policies</div>
                      <div className="text-lg font-semibold mt-1">{userPayment.activePoliciesCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="text-sm font-semibold mt-1">
                        {userPayment.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Created At</div>
                      <div className="text-sm mt-1">
                        {new Date(userPayment.createdAt.toNumber() * 1000).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Updated At</div>
                      <div className="text-sm mt-1">
                        {new Date(userPayment.updatedAt.toNumber() * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="text-md font-semibold mb-3">Payment Policies ({policies.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <th className="border p-2 text-left text-xs">Policy Address</th>
                          <th className="border p-2 text-left text-xs">ID</th>
                          <th className="border p-2 text-left text-xs">Type</th>
                          <th className="border p-2 text-left text-xs">Recipient</th>
                          <th className="border p-2 text-left text-xs">Total Paid</th>
                          <th className="border p-2 text-left text-xs">Interval</th>
                          <th className="border p-2 text-left text-xs">Next Payment</th>
                          <th className="border p-2 text-left text-xs">Status</th>
                          <th className="border p-2 text-left text-xs">Payments</th>
                          <th className="border p-2 text-left text-xs">Failed</th>
                          <th className="border p-2 text-left text-xs">Memo</th>
                          <th className="border p-2 text-left text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policies.map(({ publicKey, account }) => (
                          <tr key={publicKey.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="border p-2 font-mono text-xs">
                              <PublicKeyComponent publicKey={publicKey} />
                            </td>
                            <td className="border p-2 text-center text-sm">{account.policyId}</td>
                            <td className="border p-2 text-sm">{getPolicyType(account)}</td>
                            <td className="border p-2 font-mono text-xs">
                              <PublicKeyComponent publicKey={account.recipient} />
                            </td>
                            <td className="border p-2 font-mono text-xs">{account.totalPaid.toString()}</td>
                            <td className="border p-2 text-sm">{getInterval(account)}</td>
                            <td className="border p-2 text-sm">{getNextPaymentDue(account)}</td>
                            <td className="border p-2">
                              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                {getStatus(account)}
                              </span>
                            </td>
                            <td className="border p-2 text-center text-sm">{account.paymentCount}</td>
                            <td className="border p-2 text-center text-sm">{account.failedPaymentCount}</td>
                            <td className="border p-2 text-xs">{getMemo(account)}</td>
                            <td className="border p-2">
                              <Button
                                size="sm"
                                isIconOnly
                                color="primary"
                                variant="flat"
                                isDisabled={!isPaymentDue(account) || executingPayments.has(publicKey.toString())}
                                isLoading={executingPayments.has(publicKey.toString())}
                                onPress={() => handleExecutePayment(publicKey, account)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            <div className="text-gray-600 text-sm">
              Total user payments: <span className="font-semibold">{userPayments.length}</span>
              {' | '}
              Total policies:{' '}
              <span className="font-semibold">{userPayments.reduce((sum, up) => sum + up.policies.length, 0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
