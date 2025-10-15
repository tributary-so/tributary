import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { useSDK } from '@/lib/client'
import { type PaymentPolicy, type UserPayment, type PaymentGateway } from '@tributary-so/sdk'
import { Play, Pause, Trash2, RotateCcw, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns'
import { getMint } from '@solana/spl-token'

interface UserPaymentWithPolicies {
  userPaymentAddress: PublicKey
  userPayment: UserPayment
  policies: Array<{ publicKey: PublicKey; account: PaymentPolicy }>
}

interface TokenInfo {
  decimals: number
  symbol?: string
}

export default function AccountPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [userPayments, setUserPayments] = useState<UserPaymentWithPolicies[]>([])
  const [selectedPolicy, setSelectedPolicy] = useState<{ publicKey: PublicKey; account: PaymentPolicy } | null>(null)
  const [tokenInfoCache, setTokenInfoCache] = useState<Map<string, TokenInfo>>(new Map())
  const [executingPayments, setExecutingPayments] = useState<Set<string>>(new Set())
  const [togglingPolicies, setTogglingPolicies] = useState<Set<string>>(new Set())
  const [deletingPolicies, setDeletingPolicies] = useState<Set<string>>(new Set())
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    if (wallet.publicKey?.toString()) {
      // reload
      setLoaded(false)
    }
  }, [wallet.publicKey])

  useEffect(() => {
    const fetchPolicies = async () => {
      if (!sdk || loaded) return
      if (!wallet.publicKey) return toast.error('Wallet not connected')
      try {
        setLoading(true)
        const allPolicies = await sdk.getAllPaymentPolicies()
        const userPaymentMap = new Map<string, UserPaymentWithPolicies>()
        const tokenInfoMap = new Map<string, TokenInfo>()
        for (const policy of allPolicies) {
          const userPaymentAddress = policy.account.userPayment.toString()
          if (!userPaymentMap.has(userPaymentAddress)) {
            const userPayment = await sdk.getUserPayment(policy.account.userPayment)
            if (userPayment) {
              if (userPayment.owner.toString() != wallet.publicKey.toString()) {
                continue
              }
              userPaymentMap.set(userPaymentAddress, {
                userPaymentAddress: policy.account.userPayment,
                userPayment,
                policies: [],
              })
              const mintAddress = userPayment.tokenMint.toString()
              if (!tokenInfoMap.has(mintAddress)) {
                try {
                  const mintInfo = await getMint(connection, userPayment.tokenMint)
                  tokenInfoMap.set(mintAddress, { decimals: mintInfo.decimals, symbol: 'TOKEN' })
                } catch (err) {
                  console.error('Error fetching mint info:', err)
                }
              }
            }
          }
          const entry = userPaymentMap.get(userPaymentAddress)
          if (entry) {
            entry.policies.push(policy)
          }
        }
        tokenInfoMap.set('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', { decimals: 6, symbol: 'USDC' })
        setUserPayments(Array.from(userPaymentMap.values()))
        setTokenInfoCache(tokenInfoMap)
        if (Array.from(userPaymentMap.values()).length > 0) {
          const firstPolicy = Array.from(userPaymentMap.values())[0].policies[0]
          setSelectedPolicy(firstPolicy)
        }
        setLoaded(true)
      } catch (err) {
        console.error('Error fetching payment policies:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPolicies()
  }, [sdk, loaded, connection, wallet.publicKey])

  const getAmount = (policy: PaymentPolicy): string | null => {
    const policyType = policy.policyType as Record<string, unknown>
    if (policyType.subscription) {
      return Number((policyType.subscription as Record<string, unknown>).amount).toString()
    }
    return null
  }

  const formatAmount = (rawAmount: string | null, tokenMint: PublicKey): string => {
    if (!rawAmount) return 'N/A'
    const tokenInfo = tokenInfoCache.get(tokenMint.toString())
    if (!tokenInfo) return rawAmount
    const amount = Number(rawAmount) / Math.pow(10, tokenInfo.decimals)
    return tokenInfo.symbol ? `${amount.toLocaleString()} ${tokenInfo.symbol}` : amount.toLocaleString()
  }

  const getInterval = (policy: PaymentPolicy) => {
    const policyType = policy.policyType as Record<string, unknown>
    let intervalSeconds = 0
    if (policyType.subscription) {
      intervalSeconds = Number((policyType.subscription as Record<string, unknown>).intervalSeconds)
    }
    if (intervalSeconds === 0) return 'N/A'
    const duration = intervalToDuration({ start: 0, end: intervalSeconds * 1000 })
    return formatDuration(duration, { format: ['days', 'hours', 'minutes'] })
  }

  const getNextPaymentDue = (policy: PaymentPolicy) => {
    if (!policy.nextPaymentDue) return 'N/A'
    const nextPaymentDate = new Date(policy.nextPaymentDue.toNumber() * 1000)
    return nextPaymentDate < new Date() ? 'Overdue' : formatDistanceToNow(nextPaymentDate, { addSuffix: true })
  }

  const getStatus = (policy: PaymentPolicy) => {
    const status = policy.status as Record<string, unknown>
    if (status.active) return 'Active'
    if (status.paused) return 'Paused'
    if (status.cancelled) return 'Cancelled'
    if (status.completed) return 'Completed'
    return 'Unknown'
  }

  const getPolicyType = (policy: PaymentPolicy) => {
    const policyType = policy.policyType as Record<string, unknown>
    if (policyType.subscription) return 'Subscription'
    if (policyType.oneTime) return 'One Time'
    if (policyType.installment) return 'Installment'
    return 'Unknown'
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

  const isPaymentDue = (policy: PaymentPolicy): boolean => {
    if (!policy.nextPaymentDue) return false
    return new Date(policy.nextPaymentDue.toNumber() * 1000) <= new Date()
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAddress(type)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const handleExecutePayment = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey) return toast.error('Wallet not connected')
    try {
      const gateway: PaymentGateway | null = await sdk.getPaymentGateway(policy.gateway)
      if (!gateway) return toast.error('Gateway not found')
      if (
        gateway.authority.toString() !== wallet.publicKey.toString() &&
        userPayment.owner.toString() != wallet.publicKey.toString()
      ) {
        return toast.error('Only the gateway authority can execute payments')
      }
      setExecutingPayments((prev) => new Set(prev).add(policyPublicKey.toString()))
      const tx = new Transaction()
      const executeIxs = await sdk.executePayment(policyPublicKey)
      executeIxs.map((instruction) => tx.add(instruction))
      const txid = await sdk.provider.sendAndConfirm(tx)
      toast.success(`Payment executed! TX: ${txid}`)
      setLoaded(false)
    } catch (err) {
      console.error('Error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to execute payment')
    } finally {
      setExecutingPayments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(policyPublicKey.toString())
        return newSet
      })
    }
  }

  const handleToggleStatus = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey) return toast.error('Wallet not connected')
    if (userPayment.owner.toString() !== wallet.publicKey.toString()) {
      return toast.error('Only the policy owner can change status')
    }
    try {
      setTogglingPolicies((prev) => new Set(prev).add(policyPublicKey.toString()))
      const currentStatus = policy.status as Record<string, unknown>
      const isCurrentlyActive = currentStatus.active
      const newStatus = isCurrentlyActive ? { paused: {} } : { active: {} }
      const tx = new Transaction()
      const toggleIx = await sdk.changePaymentPolicyStatus(userPayment.tokenMint, policy.policyId, newStatus)
      tx.add(toggleIx)
      await sdk.provider.sendAndConfirm(tx)
      toast.success(`Payment policy ${isCurrentlyActive ? 'paused' : 'resumed'}!`)
      setLoaded(false)
    } catch (err) {
      console.error('Error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to toggle status')
    } finally {
      setTogglingPolicies((prev) => {
        const newSet = new Set(prev)
        newSet.delete(policyPublicKey.toString())
        return newSet
      })
    }
  }

  const handleDeletePolicy = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey) return toast.error('Wallet not connected')
    if (userPayment.owner.toString() !== wallet.publicKey.toString()) {
      return toast.error('Only the policy owner can delete')
    }
    if (!confirm('Delete this payment policy? This cannot be undone.')) return
    try {
      setDeletingPolicies((prev) => new Set(prev).add(policyPublicKey.toString()))
      const tx = new Transaction()
      const deleteIx = await sdk.deletePaymentPolicy(userPayment.tokenMint, policy.policyId)
      tx.add(deleteIx)
      await sdk.provider.sendAndConfirm(tx)
      toast.success('Payment policy deleted!')
      setLoaded(false)
    } catch (err) {
      console.error('Error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingPolicies((prev) => {
        const newSet = new Set(prev)
        newSet.delete(policyPublicKey.toString())
        return newSet
      })
    }
  }

  if (!wallet.connected) {
    return (
      <div className="flex items-center">
        <p className="text-xl">Please connect your wallet to view your account</p>
      </div>
    )
  }

  if (userPayments.length < 1) {
    return (
      <div className="flex items-center">
        <p className="text-xl">You don't have any Subscriptions yet</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center">
        <div>
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p
            className="text-sm uppercase"
            style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
          >
            Loading...
          </p>
        </div>
      </div>
    )
  }

  const currentUserPayment = selectedPolicy
    ? userPayments.find((up) => up.policies.some((p) => p.publicKey.toString() === selectedPolicy.publicKey.toString()))
    : null

  const DetailRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
    <div className="flex items-center py-2 border-b border-gray-100">
      <span className="min-w-[180px] text-sm text-gray-600 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm break-all">{value}</span>
        {copyable && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            {copiedAddress === label ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500" />
            )}
          </button>
        )}
      </div>
    </div>
  )

  let policyCounter = 0

  return (
    <div className="flex items-start">
      <div className="w-[368px] border-r border-gray-200">
        <div className="flex flex-col">
          {userPayments.map(({ policies, userPayment }) => {
            const policiesComponent = policies.map((policy) => {
              policyCounter++
              const isSelected = selectedPolicy?.publicKey.toString() === policy.publicKey.toString()
              return (
                <div
                  key={policy.publicKey.toString()}
                  onClick={() => setSelectedPolicy(policy)}
                  className="h-14 flex items-center px-4 cursor-pointer transition-colors hover:bg-gray-50"
                  style={{ backgroundColor: isSelected ? '#f5f7f7' : 'transparent' }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center border border-[var(--color-primary)] rounded text-xs"
                    style={{ backgroundColor: isSelected ? '#fff' : 'transparent' }}
                  >
                    {policyCounter}
                  </div>
                  <div className="ml-3 flex items-center gap-2 text-sm">
                    <span className="uppercase" style={{ color: 'var(--color-primary)' }}>
                      Policy-{policy.account.policyId}
                    </span>
                    <span className="uppercase text-gray-600">( {policy.account.paymentCount} )</span>
                  </div>
                </div>
              )
            })

            return (
              <div>
                <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="uppercase text-sm">
                      {tokenInfoCache.get(userPayment.tokenMint.toString())?.symbol ?? 'unknown'}
                    </span>
                    <span className="uppercase text-sm">
                      ({userPayments.reduce((sum, up) => sum + up.policies.length, 0)})
                    </span>
                  </div>
                </div>
                <div>{policiesComponent}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="h-12 flex items-center px-6 border-b border-gray-200">
          <span className="uppercase text-sm">
            {selectedPolicy ? `Policy-${selectedPolicy.account.policyId} subscription` : 'Select a policy'}
          </span>
        </div>

        {selectedPolicy && currentUserPayment && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                  <circle cx="9" cy="9" r="7" />
                </svg>
                <span className="underline font-medium">Details</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleExecutePayment(
                      selectedPolicy.publicKey,
                      selectedPolicy.account,
                      currentUserPayment.userPayment,
                    )
                  }
                  disabled={
                    !isPaymentDue(selectedPolicy.account) || executingPayments.has(selectedPolicy.publicKey.toString())
                  }
                  className="p-2 border border-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {executingPayments.has(selectedPolicy.publicKey.toString()) ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() =>
                    handleToggleStatus(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                  }
                  disabled={togglingPolicies.has(selectedPolicy.publicKey.toString())}
                  className="p-2 border border-orange-600 rounded hover:bg-orange-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {togglingPolicies.has(selectedPolicy.publicKey.toString()) ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : getStatus(selectedPolicy.account) === 'Active' ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() =>
                    handleDeletePolicy(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                  }
                  disabled={deletingPolicies.has(selectedPolicy.publicKey.toString())}
                  className="p-2 border border-red-600 rounded hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingPolicies.has(selectedPolicy.publicKey.toString()) ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="max-w-[700px]">
              <DetailRow label="Policy Address" value={selectedPolicy.publicKey.toString()} copyable />
              <DetailRow label="Owner" value={currentUserPayment.userPayment.owner.toString()} copyable />
              <DetailRow label="Policy ID" value={`#${selectedPolicy.account.policyId}`} />
              <DetailRow label="Type" value={getPolicyType(selectedPolicy.account)} />
              <DetailRow label="Status" value={getStatus(selectedPolicy.account)} />
              <DetailRow label="Recipient" value={selectedPolicy.account.recipient.toString()} copyable />
              <DetailRow label="Gateway" value={selectedPolicy.account.gateway.toString()} copyable />
              <DetailRow label="Token Mint" value={currentUserPayment.userPayment.tokenMint.toString()} copyable />
              <DetailRow
                label="Amount"
                value={formatAmount(getAmount(selectedPolicy.account), currentUserPayment.userPayment.tokenMint)}
              />
              <DetailRow label="Interval" value={getInterval(selectedPolicy.account)} />
              <DetailRow label="Next Payment" value={getNextPaymentDue(selectedPolicy.account)} />
              <DetailRow
                label="Total Paid"
                value={formatAmount(
                  selectedPolicy.account.totalPaid.toString(),
                  currentUserPayment.userPayment.tokenMint,
                )}
              />
              <DetailRow label="Payments" value={selectedPolicy.account.paymentCount.toString()} />
              <DetailRow
                label="Created"
                value={new Date(currentUserPayment.userPayment.createdAt.toNumber() * 1000).toLocaleString()}
              />
              {getMemo(selectedPolicy.account) && <DetailRow label="Memo" value={getMemo(selectedPolicy.account)} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
