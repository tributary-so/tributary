import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Spinner } from '@heroui/react'
import { Alert, AlertDescription } from '../ui/alert'
import { useSDK } from '@/lib/client'
import type { PaymentPolicy, UserPayment } from '@tributary/sdk'
import { PublicKeyComponent } from '@/components/ui/public-key'

interface PolicyWithUserPayment {
  publicKey: PublicKey
  account: PaymentPolicy
  userPayment: UserPayment | null
}

export default function PaymentPolicyList() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policies, setPolicies] = useState<PolicyWithUserPayment[]>([])

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

        const policiesWithUserPayment = await Promise.all(
          allPolicies.map(async (policy) => {
            const userPayment = await sdk.getUserPayment(policy.account.userPayment)
            return {
              ...policy,
              userPayment,
            }
          }),
        )

        setPolicies(policiesWithUserPayment)
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
    if (policyType.subscription) {
      return `${(policyType.subscription as Record<string, unknown>).intervalSeconds?.toString()}s`
    } else if (policyType.installment) {
      return `${(policyType.installment as Record<string, unknown>).intervalSeconds?.toString()}s`
    }
    return 'N/A'
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

        {!loading && !error && policies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No payment policies found</p>
            <p className="text-gray-500 mt-2">Create your first payment policy to get started</p>
          </div>
        )}

        {!loading && !error && policies.length > 0 && (
          <div className="w-full space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Payment Policies</h2>
              <p className="text-gray-600">View all existing payment policies</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border p-3 text-left">Policy Address</th>
                    <th className="border p-3 text-left">Policy ID</th>
                    <th className="border p-3 text-left">Type</th>
                    <th className="border p-3 text-left">Recipient</th>
                    <th className="border p-3 text-left">Total Paid</th>
                    <th className="border p-3 text-left">Interval</th>
                    <th className="border p-3 text-left">Status</th>
                    <th className="border p-3 text-left">Payment Count</th>
                    <th className="border p-3 text-left">Failed Count</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map(({ publicKey, account, userPayment }) => (
                    <tr key={publicKey.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="border p-3">
                        <div className="space-y-3">
                          {userPayment && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Policy Address</div>
                                <div className="font-mono text-sm">
                                  <PublicKeyComponent publicKey={publicKey} />
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Token Mint</div>
                                <div className="font-mono text-xs mt-0.5">
                                  <PublicKeyComponent publicKey={userPayment.tokenMint} />
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Active Policies</div>
                                <div className="text-sm font-semibold mt-0.5">{userPayment.activePoliciesCount}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Is Active</div>
                                <div className="text-sm font-semibold mt-0.5">
                                  {userPayment.isActive ? (
                                    <span className="text-green-600">Yes</span>
                                  ) : (
                                    <span className="text-red-600">No</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Created At</div>
                                <div className="text-xs mt-0.5">
                                  {new Date(userPayment.createdAt.toNumber() * 1000).toLocaleString()}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <div className="text-xs text-gray-500">Updated At</div>
                                <div className="text-xs mt-0.5">
                                  {new Date(userPayment.updatedAt.toNumber() * 1000).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="border p-3 text-center">{account.policyId}</td>
                      <td className="border p-3">{getPolicyType(account)}</td>
                      <td className="border p-3 font-mono text-sm">
                        <PublicKeyComponent publicKey={account.recipient} />
                      </td>
                      <td className="border p-3 font-mono text-sm">{account.totalPaid.toString()}</td>
                      <td className="border p-3">{getInterval(account)}</td>
                      <td className="border p-3">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {getStatus(account)}
                        </span>
                      </td>
                      <td className="border p-3 text-center">{account.paymentCount}</td>
                      <td className="border p-3 text-center">{account.failedPaymentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-gray-600 text-sm">
              Total policies: <span className="font-semibold">{policies.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
