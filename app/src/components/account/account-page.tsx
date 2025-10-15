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
  const [selectedFilter, setSelectedFilter] = useState('Details')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<{ publicKey: PublicKey; account: PaymentPolicy } | null>(null)
  const [tokenInfoCache, setTokenInfoCache] = useState<Map<string, TokenInfo>>(new Map())
  const [executingPayments, setExecutingPayments] = useState<Set<string>>(new Set())
  const [togglingPolicies, setTogglingPolicies] = useState<Set<string>>(new Set())
  const [deletingPolicies, setDeletingPolicies] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [buttonHtml, setButtonHtml] = useState('')
  const [buttonCss, setButtonCss] = useState('')

  const filterOptions = [
    { label: 'Details', value: 'details' },
    { label: 'Integration Code', value: 'integration' },
    { label: 'Subscribers', value: 'subscribers' },
  ]

  useEffect(() => {
    if (wallet.publicKey?.toString()) {
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
          setButtonHtml(
            `<button class="tributary-subscribe-btn" data-policy-id="${firstPolicy.account.policyId}">Subscribe Now</button>`,
          )
          setButtonCss(`.tributary-subscribe-btn {
          padding: 8px 16px;
          border: 1px solid #000970;
          border-radius: 4px;
          background: transparent;
          color: #000970;
          font-family: 'Denim', sans-serif;
          font-size: 14px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tributary-subscribe-btn:hover {
          background: #000970;
          color: white;
        }`)
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

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(type)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!wallet.connected) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <p className="text-lg text-gray-600">Please connect your wallet to view your account</p>
      </div>
    )
  }

  if (userPayments.length < 1 && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <p className="text-lg text-gray-600">You don't have any Subscriptions yet</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-16 h-16 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p
          className="text-sm uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
        >
          Loading...
        </p>
      </div>
    )
  }

  const currentUserPayment = selectedPolicy
    ? userPayments.find((up) => up.policies.some((p) => p.publicKey.toString() === selectedPolicy.publicKey.toString()))
    : null

  const jsCode = `<script src="https://cdn.tributary.io/v1/tributary.js"></script>\n<script>\n  Tributary.init({\n    apiKey: 'your_api_key_here',\n    network: 'mainnet'\n  })\n</script>`

  const DetailRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
    <div className="flex items-center py-3 border-b border-gray-100 last:border-0">
      <span className="min-w-[200px] text-sm text-gray-600 uppercase font-medium">{label}</span>
      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm break-all text-gray-900">{value}</span>
        {copyable && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            title="Copy to clipboard"
          >
            {copiedAddress === label ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
    </div>
  )

  let policyCounter = 0

  return (
    <div className="w-full min-h-screen">
      <div className="flex max-w-[1400px] mx-auto">
        {/* Sticky Sidebar */}
        <div className="w-[380px] flex-shrink-0">
          <div className="sticky top-0">
            <div className="border-r border-gray-200">
              {/* Sidebar Header */}
              <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <span className="uppercase text-sm font-medium">Subscriptions</span>
                  <span className="text-sm text-gray-500">
                    ({userPayments.reduce((sum, up) => sum + up.policies.length, 0)})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFilter('Details')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-all uppercase font-medium"
                  style={{ fontFamily: 'var(--font-secondary)' }}
                >
                  Overview
                  <svg className="w-3 h-3" viewBox="0 0 4 9" fill="currentColor">
                    <path d="M0 0L4 4.5L0 9" />
                  </svg>
                </button>
              </div>

              {/* Policy List */}
              <div className="bg-white">
                {userPayments.map(({ policies, userPayment }) =>
                  policies.map((policy) => {
                    policyCounter++
                    const isSelected = selectedPolicy?.publicKey.toString() === policy.publicKey.toString()
                    return (
                      <div
                        key={policy.publicKey.toString()}
                        onClick={() => setSelectedPolicy(policy)}
                        className="h-16 flex items-center px-5 cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ backgroundColor: isSelected ? '#f5f7f7' : 'transparent' }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center border border-[var(--color-primary)] rounded text-sm font-medium flex-shrink-0"
                          style={{ backgroundColor: isSelected ? '#fff' : 'transparent' }}
                        >
                          {policyCounter}
                        </div>
                        <div className="ml-4 flex items-center gap-2 text-sm">
                          <span className="uppercase font-medium" style={{ color: 'var(--color-primary)' }}>
                            Policy-{policy.account.policyId}
                          </span>
                          <span className="text-gray-500">
                            ({tokenInfoCache.get(userPayment.tokenMint.toString())?.symbol ?? 'unknown'})
                          </span>
                          <span className="text-gray-400">· {policy.account.paymentCount}</span>
                        </div>
                      </div>
                    )
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="h-14 flex items-center px-8">
              <span className="uppercase text-sm font-medium">
                {selectedPolicy ? `Policy-${selectedPolicy.account.policyId} subscription` : 'Select a policy'}
              </span>
              <div className="relative ml-5">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {selectedFilter}
                  <svg className="w-2.5 h-2.5" viewBox="0 0 8 8" fill="currentColor">
                    <path d="M0 2L4 6L8 2" />
                  </svg>
                </button>
                {showDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-[180px] z-50">
                    {filterOptions.map((option) => (
                      <div
                        key={option.value}
                        className="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{
                          backgroundColor: selectedFilter === option.label ? '#edefef' : 'transparent',
                          fontWeight: selectedFilter === option.label ? 600 : 400,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFilter(option.label)
                          setShowDropdown(false)
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          {selectedPolicy && currentUserPayment && (
            <div className="p-8">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 18 18" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                    <circle cx="9" cy="9" r="7" />
                  </svg>
                  <span className="underline font-medium" style={{ textUnderlineOffset: '3px' }}>{selectedFilter}</span>
                </div>
                {selectedFilter === 'Details' && (
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
                        !isPaymentDue(selectedPolicy.account) ||
                        executingPayments.has(selectedPolicy.publicKey.toString())
                      }
                      className="p-2.5 border border-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Execute payment"
                    >
                      {executingPayments.has(selectedPolicy.publicKey.toString()) ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        handleToggleStatus(
                          selectedPolicy.publicKey,
                          selectedPolicy.account,
                          currentUserPayment.userPayment,
                        )
                      }
                      disabled={togglingPolicies.has(selectedPolicy.publicKey.toString())}
                      className="p-2.5 border border-orange-600 rounded hover:bg-orange-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={getStatus(selectedPolicy.account) === 'Active' ? 'Pause' : 'Resume'}
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
                        handleDeletePolicy(
                          selectedPolicy.publicKey,
                          selectedPolicy.account,
                          currentUserPayment.userPayment,
                        )
                      }
                      disabled={deletingPolicies.has(selectedPolicy.publicKey.toString())}
                      className="p-2.5 border border-red-600 rounded hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete policy"
                    >
                      {deletingPolicies.has(selectedPolicy.publicKey.toString()) ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Details View */}
              {selectedFilter === 'Details' && (
                <div className="max-w-full">
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
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

              {/* Integration Code View */}
              {selectedFilter === 'Integration Code' && (
                <div className="max-w-full space-y-5">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Edit the HTML and CSS below. The button preview updates in real-time.
                  </p>

                  {/* Preview */}
                  <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs uppercase font-semibold mb-3 text-gray-600">Preview</p>
                    <div className="flex items-center justify-center p-6 bg-white border border-gray-200 rounded">
                      <div dangerouslySetInnerHTML={{ __html: `<style>${buttonCss}</style>${buttonHtml}` }} />
                    </div>
                  </div>

                  {/* HTML */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold uppercase text-gray-700">HTML</span>
                      <button
                        onClick={() => copyCode(buttonHtml, 'html')}
                        className="px-3 py-1.5 text-xs border rounded hover:bg-gray-200 transition-colors font-medium"
                        style={{ borderColor: 'var(--color-primary)' }}
                      >
                        {copiedCode === 'html' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={buttonHtml}
                      onChange={(e) => setButtonHtml(e.target.value)}
                      className="w-full p-4 bg-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  {/* CSS */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold uppercase text-gray-700">CSS</span>
                      <button
                        onClick={() => copyCode(buttonCss, 'css')}
                        className="px-3 py-1.5 text-xs border rounded hover:bg-gray-200 transition-colors font-medium"
                        style={{ borderColor: 'var(--color-primary)' }}
                      >
                        {copiedCode === 'css' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={buttonCss}
                      onChange={(e) => setButtonCss(e.target.value)}
                      className="w-full p-4 bg-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={12}
                    />
                  </div>

                  {/* JavaScript */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold uppercase text-gray-700">JavaScript</span>
                      <button
                        onClick={() => copyCode(jsCode, 'js')}
                        className="px-3 py-1.5 text-xs border rounded hover:bg-gray-200 transition-colors font-medium"
                        style={{ borderColor: 'var(--color-primary)' }}
                      >
                        {copiedCode === 'js' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-4 bg-white overflow-x-auto text-sm font-mono">
                      {jsCode}
                    </pre>
                  </div>
                </div>
              )}

              {/* Subscribers View */}
              {selectedFilter === 'Subscribers' && (
                <div className="max-w-full">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-5 border border-gray-200 rounded-lg text-center bg-gray-50">
                      <div className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                        0
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">Active</div>
                    </div>
                    <div className="p-5 border border-gray-200 rounded-lg text-center bg-gray-50">
                      <div className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                        0
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">New</div>
                    </div>
                    <div className="p-5 border border-gray-200 rounded-lg text-center bg-gray-50">
                      <div className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                        0
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">Cancelled</div>
                    </div>
                    <div className="p-5 border border-gray-200 rounded-lg text-center bg-gray-50">
                      <div className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                        0%
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">Retention</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}