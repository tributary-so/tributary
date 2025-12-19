import { useState, useEffect, useMemo } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { decodeMemo, type PaymentPolicy, type UserPayment, type PaymentGateway } from '@tributary-so/sdk'
import { Play, Pause, Trash2, RotateCcw, Copy, Check, RefreshCw, AlertCircle } from '../../icons'
import { toast } from 'sonner'
import { formatDistanceToNow, formatDuration, intervalToDuration, differenceInSeconds, addSeconds } from 'date-fns'
import { PublicKeyComponent } from '../ui/public-key'
import { getTokenPrecisionAtom, getTokenSymbolAtom } from '@/lib/token-store'
import { useAtomValue } from 'jotai'

interface UserPaymentWithPolicies {
  userPaymentAddress: PublicKey
  userPayment: UserPayment
  policies: Array<{ publicKey: PublicKey; account: PaymentPolicy }>
}

type PolicyTypeKey = 'subscription' | 'milestone' | 'payAsYouGo'
type StatusKey = 'active' | 'paused' | 'cancelled' | 'completed'

function getPolicyTypeKey(policy: PaymentPolicy): PolicyTypeKey {
  if ('subscription' in policy.policyType) return 'subscription'
  if ('milestone' in policy.policyType) return 'milestone'
  return 'payAsYouGo'
}

function getStatusKey(policy: PaymentPolicy): StatusKey {
  const status = policy.status as Record<string, unknown>
  if (status.active) return 'active'
  if (status.paused) return 'paused'
  if (status.cancelled) return 'cancelled'
  if (status.completed) return 'completed'
  return 'active'
}

const POLICY_TYPE_CONFIG: Record<
  PolicyTypeKey,
  {
    icon: string
    label: string
    color: string
    bgColor: string
    borderColor: string
    description: string
  }
> = {
  subscription: {
    icon: '🔄',
    label: 'Subscription',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Recurring payments',
  },
  milestone: {
    icon: '🎯',
    label: 'Milestone',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Stage-based payments',
  },
  payAsYouGo: {
    icon: '⚡',
    label: 'Pay-as-you-go',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Usage-based payments',
  },
}

const STATUS_CONFIG: Record<
  StatusKey | 'overdue',
  {
    label: string
    color: string
    bgColor: string
    dotColor: string
  }
> = {
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    dotColor: 'bg-green-500',
  },
  paused: {
    label: 'Paused',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    dotColor: 'bg-orange-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    dotColor: 'bg-gray-400',
  },
  completed: {
    label: 'Completed',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    dotColor: 'bg-blue-500',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    dotColor: 'bg-red-500',
  },
}

function StatusBadge({ status, isOverdue }: { status: StatusKey; isOverdue: boolean }) {
  const config = isOverdue && status === 'active' ? STATUS_CONFIG.overdue : STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${
          status === 'active' && !isOverdue ? 'animate-pulse' : ''
        }`}
      />
      {config.label}
    </span>
  )
}

function PolicyTypeBadge({ type }: { type: PolicyTypeKey }) {
  const config = POLICY_TYPE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}

function CircularProgress({ progress, size = 48 }: { progress: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-indigo-600 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-700">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

function ProgressBar({ progress, color = 'bg-indigo-600' }: { progress: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

function MilestoneTracker({
  currentMilestone,
  totalMilestones,
  milestoneAmounts,
  milestoneTimestamps,
  formatAmount,
}: {
  currentMilestone: number
  totalMilestones: number
  milestoneAmounts: anchor.BN[]
  milestoneTimestamps: anchor.BN[]
  formatAmount: (amount: string) => string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Progress</span>
        <span className="font-semibold text-amber-700">
          {currentMilestone} / {totalMilestones} completed
        </span>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalMilestones }).map((_, i) => {
          const isCompleted = i < currentMilestone
          const isCurrent = i === currentMilestone
          const amount = milestoneAmounts[i]
          const timestamp = milestoneTimestamps[i]
          const isDue = timestamp && timestamp.toNumber() > 0 && new Date(timestamp.toNumber() * 1000) <= new Date()

          return (
            <div key={i} className="flex-1 group relative">
              {i > 0 && (
                <div className={`absolute top-3 -left-1 w-2 h-0.5 ${isCompleted ? 'bg-amber-500' : 'bg-gray-200'}`} />
              )}

              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${
                      isCompleted
                        ? 'bg-amber-500 text-white'
                        : isCurrent
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                        : 'bg-gray-100 text-gray-400'
                    }
                    ${isDue && !isCompleted ? 'ring-2 ring-red-400' : ''}`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>

                <span
                  className={`mt-1 text-xs ${
                    isCompleted ? 'text-gray-500' : isCurrent ? 'text-amber-700 font-medium' : 'text-gray-400'
                  }`}
                >
                  {amount && !amount.isZero() ? formatAmount(amount.toString()) : '-'}
                </span>

                {timestamp && timestamp.toNumber() > 0 && !isCompleted && (
                  <span className={`text-[10px] ${isDue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                    {isDue
                      ? 'Due now'
                      : formatDistanceToNow(new Date(timestamp.toNumber() * 1000), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UsageGauge({
  used,
  limit,
  formatAmount,
}: {
  used: anchor.BN
  limit: anchor.BN
  formatAmount: (amount: string) => string
}) {
  const usedNum = used.toNumber()
  const limitNum = limit.toNumber()
  const percentage = limitNum > 0 ? (usedNum / limitNum) * 100 : 0

  const getColor = () => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-orange-600'
    return 'text-emerald-600'
  }

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-orange-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Usage this period</span>
        <span className={`text-lg font-bold ${getColor()}`}>{percentage.toFixed(1)}%</span>
      </div>

      <ProgressBar progress={percentage} color={getBarColor()} />

      <div className="flex justify-between text-xs text-gray-500">
        <span>Used: {formatAmount(used.toString())}</span>
        <span>Limit: {formatAmount(limit.toString())}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
    </div>
  )
}

function ActionButton({
  onClick,
  loading,
  disabled,
  variant,
  children,
  title,
}: {
  onClick: () => void
  loading: boolean
  disabled: boolean
  variant: 'primary' | 'warning' | 'danger'
  children: React.ReactNode
  title: string
}) {
  const variants = {
    primary: 'border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white',
    warning: 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white',
    danger: 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`p-2.5 border-2 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title={`Copy ${label}`}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
    </button>
  )
}

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center py-2 border-b border-gray-50 last:border-0">
      <span className="min-w-[140px] text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm text-gray-800 truncate">{value}</span>
        {copyable && <CopyButton value={value} label={label} />}
      </div>
    </div>
  )
}

interface PolicyCardProps {
  policy: { publicKey: PublicKey; account: PaymentPolicy }
  userPayment: UserPayment
  isSelected: boolean
  onClick: () => void
  formatAmount: (rawAmount: string | null, tokenMint: PublicKey) => string
  getNextPaymentDue: (policy: PaymentPolicy) => string
}

function PolicyCard({ policy, isSelected, onClick, getNextPaymentDue }: PolicyCardProps) {
  const policyType = getPolicyTypeKey(policy.account)
  const statusKey = getStatusKey(policy.account)

  const isOverdue = useMemo(() => {
    if ('subscription' in policy.account.policyType) {
      const sub = policy.account.policyType.subscription
      if (sub?.nextPaymentDue) {
        return new Date(sub.nextPaymentDue.toNumber() * 1000) < new Date()
      }
    }
    if ('milestone' in policy.account.policyType) {
      const milestone = policy.account.policyType.milestone
      if (milestone && milestone.currentMilestone < milestone.totalMilestones) {
        const nextTimestamp = milestone.milestoneTimestamps[milestone.currentMilestone]
        if (nextTimestamp && nextTimestamp.toNumber() > 0) {
          return new Date(nextTimestamp.toNumber() * 1000) < new Date()
        }
      }
    }
    return false
  }, [policy.account])

  const memo = decodeMemo(policy.account.memo || [])

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 cursor-pointer transition-all duration-200 border-b border-gray-100
        hover:bg-gray-50 group
        ${
          isSelected
            ? 'bg-gradient-to-r from-indigo-50 to-white border-l-4 border-l-indigo-600'
            : 'border-l-4 border-l-transparent'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div>
            <PolicyTypeBadge type={policyType} />
            <div className="text-[11px] text-gray-400 mt-0.5">ID: {policy.account.policyId}</div>
          </div>
        </div>
        <StatusBadge status={statusKey} isOverdue={isOverdue} />
      </div>

      <div className="text-sm font-medium text-gray-800 mb-1 truncate">{memo || 'Untitled Policy'}</div>

      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        <span>To:</span>
        <PublicKeyComponent publicKey={policy.account.recipient} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {policy.account.paymentCount} payment{policy.account.paymentCount !== 1 ? 's' : ''}
        </span>
        <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
          {getNextPaymentDue(policy.account)}
        </span>
      </div>

      {isSelected && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
          →
        </div>
      )}
    </div>
  )
}

interface DetailPanelProps {
  policy: { publicKey: PublicKey; account: PaymentPolicy }
  userPayment: UserPaymentWithPolicies
  formatAmount: (rawAmount: string | null, tokenMint: PublicKey) => string
  getInterval: (policy: PaymentPolicy) => string
  getNextPaymentDue: (policy: PaymentPolicy) => string
  isPaymentDue: boolean
  onExecute: () => void
  onToggle: () => void
  onDelete: () => void
  executingPayments: Set<string>
  togglingPolicies: Set<string>
  deletingPolicies: Set<string>
}

function SubscriptionDetailPanel(props: DetailPanelProps) {
  const {
    policy,
    userPayment,
    formatAmount,
    getInterval,
    getNextPaymentDue,
    isPaymentDue,
    onExecute,
    onToggle,
    onDelete,
    executingPayments,
    togglingPolicies,
    deletingPolicies,
  } = props
  const sub = policy.account.policyType.subscription!
  const tokenMint = userPayment.userPayment.tokenMint
  const status = getStatusKey(policy.account)

  const nextPaymentDate = useMemo(
    () => (sub.nextPaymentDue ? new Date(sub.nextPaymentDue.toNumber() * 1000) : null),
    [sub.nextPaymentDue],
  )

  const intervalSeconds = useMemo(() => {
    const policyType = policy.account.policyType as Record<string, unknown>
    if (policyType.subscription) {
      const paymentFrequency = (policyType.subscription as Record<string, unknown>).paymentFrequency as Record<
        string,
        unknown
      >
      const frequencyKey = Object.keys(paymentFrequency)[0]
      switch (frequencyKey) {
        case 'daily':
          return 86400
        case 'weekly':
          return 604800
        case 'monthly':
          return 2592000
        case 'quarterly':
          return 7776000
        case 'semiAnnually':
          return 15552000
        case 'annually':
          return 31536000
        case 'custom':
          return ((paymentFrequency.custom as Record<string, unknown>)[0] as anchor.BN).toNumber()
        default:
          return 0
      }
    }
    return 0
  }, [policy.account.policyType])

  const lastPaymentDate = useMemo(
    () => (nextPaymentDate && intervalSeconds > 0 ? addSeconds(nextPaymentDate, -intervalSeconds) : null),
    [nextPaymentDate, intervalSeconds],
  )

  const progressToNextPayment = useMemo(() => {
    if (!nextPaymentDate || !lastPaymentDate) return 0
    const now = new Date()
    const total = differenceInSeconds(nextPaymentDate, lastPaymentDate)
    const elapsed = differenceInSeconds(now, lastPaymentDate)
    if (total <= 0) return 100
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }, [nextPaymentDate, lastPaymentDate])

  const isOverdue = nextPaymentDate && nextPaymentDate < new Date()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔄</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Subscription</h2>
              <p className="text-sm text-gray-500">Recurring payment policy</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={!!isOverdue} />
        </div>

        <div className="flex gap-2">
          <ActionButton
            onClick={onExecute}
            loading={executingPayments.has(policy.publicKey.toString())}
            disabled={!isPaymentDue}
            variant="primary"
            title={isPaymentDue ? 'Execute payment now' : 'Payment not due yet'}
          >
            <Play className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={onToggle}
            loading={togglingPolicies.has(policy.publicKey.toString())}
            disabled={false}
            variant="warning"
            title={status === 'active' ? 'Pause subscription' : 'Resume subscription'}
          >
            {status === 'active' ? <Pause className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </ActionButton>
          <ActionButton
            onClick={onDelete}
            loading={deletingPolicies.has(policy.publicKey.toString())}
            disabled={false}
            variant="danger"
            title="Delete subscription"
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-5 border border-indigo-100">
        <div className="text-sm text-indigo-600 font-medium mb-1">Payment Amount</div>
        <div className="text-3xl font-bold text-indigo-900 mb-2">{formatAmount(sub.amount.toString(), tokenMint)}</div>
        <div className="text-sm text-indigo-600">every {getInterval(policy.account)}</div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Time to next payment</span>
          <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-indigo-700'}`}>
            {getNextPaymentDue(policy.account)}
          </span>
        </div>
        <ProgressBar progress={progressToNextPayment} color={isOverdue ? 'bg-red-500' : 'bg-indigo-600'} />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Last: {lastPaymentDate ? formatDistanceToNow(lastPaymentDate, { addSuffix: true }) : 'Never'}</span>
          <span>Next: {nextPaymentDate ? nextPaymentDate.toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Paid" value={formatAmount(policy.account.totalPaid.toString(), tokenMint)} />
        <StatCard label="Payments" value={policy.account.paymentCount.toString()} />
        <StatCard label="Auto-Renew" value={sub.autoRenew ? 'Yes' : 'No'} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Policy Details</h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          <DetailRow
            label="Created"
            value={new Date(userPayment.userPayment.createdAt.toNumber() * 1000).toLocaleString()}
          />
        </div>
      </div>
    </div>
  )
}

function MilestoneDetailPanel(props: DetailPanelProps) {
  const {
    policy,
    userPayment,
    formatAmount,
    getNextPaymentDue,
    isPaymentDue,
    onExecute,
    onToggle,
    onDelete,
    executingPayments,
    togglingPolicies,
    deletingPolicies,
  } = props
  const milestone = policy.account.policyType.milestone!
  const tokenMint = userPayment.userPayment.tokenMint
  const status = getStatusKey(policy.account)

  const totalAmount = milestone.milestoneAmounts.reduce((sum, amt) => sum.add(amt), new anchor.BN(0))
  const completedAmount = milestone.milestoneAmounts
    .slice(0, milestone.currentMilestone)
    .reduce((sum, amt) => sum.add(amt), new anchor.BN(0))

  const progressPercent = (milestone.currentMilestone / milestone.totalMilestones) * 100

  const releaseConditions = ['Time-based', 'Manual Approval', 'Automatic']
  const releaseCondition = releaseConditions[milestone.releaseCondition] || 'Unknown'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Milestone Payment</h2>
              <p className="text-sm text-gray-500">Stage-based payment policy</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={false} />
        </div>

        <div className="flex gap-2">
          <ActionButton
            onClick={onExecute}
            loading={executingPayments.has(policy.publicKey.toString())}
            disabled={!isPaymentDue || milestone.currentMilestone >= milestone.totalMilestones}
            variant="primary"
            title={isPaymentDue ? 'Execute next milestone' : 'Milestone not due yet'}
          >
            <Play className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={onToggle}
            loading={togglingPolicies.has(policy.publicKey.toString())}
            disabled={false}
            variant="warning"
            title={status === 'active' ? 'Pause milestones' : 'Resume milestones'}
          >
            {status === 'active' ? <Pause className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </ActionButton>
          <ActionButton
            onClick={onDelete}
            loading={deletingPolicies.has(policy.publicKey.toString())}
            disabled={false}
            variant="danger"
            title="Delete milestone policy"
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-amber-600 font-medium mb-1">Total Value</div>
            <div className="text-3xl font-bold text-amber-900">{formatAmount(totalAmount.toString(), tokenMint)}</div>
          </div>
          <CircularProgress progress={progressPercent} size={64} />
        </div>
        <div className="text-sm text-amber-600">
          {formatAmount(completedAmount.toString(), tokenMint)} released so far
        </div>
      </div>

      <MilestoneTracker
        currentMilestone={milestone.currentMilestone}
        totalMilestones={milestone.totalMilestones}
        milestoneAmounts={milestone.milestoneAmounts}
        milestoneTimestamps={milestone.milestoneTimestamps}
        formatAmount={(amt) => formatAmount(amt, tokenMint)}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Next Due" value={getNextPaymentDue(policy.account)} />
        <StatCard label="Release Type" value={releaseCondition} />
        <StatCard label="Payments Made" value={policy.account.paymentCount.toString()} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Policy Details</h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          <DetailRow label="Escrow Amount" value={formatAmount(milestone.escrowAmount.toString(), tokenMint)} />
        </div>
      </div>
    </div>
  )
}

function PayAsYouGoDetailPanel(props: DetailPanelProps) {
  const {
    policy,
    userPayment,
    formatAmount,
    onExecute,
    onToggle,
    onDelete,
    executingPayments,
    togglingPolicies,
    deletingPolicies,
  } = props
  const payg = policy.account.policyType.payAsYouGo!
  const tokenMint = userPayment.userPayment.tokenMint
  const status = getStatusKey(policy.account)

  const periodStartDate = payg.currentPeriodStart ? new Date(payg.currentPeriodStart.toNumber() * 1000) : null
  const periodEndDate =
    periodStartDate && payg.periodLengthSeconds
      ? addSeconds(periodStartDate, payg.periodLengthSeconds.toNumber())
      : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚡</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pay-as-you-go</h2>
              <p className="text-sm text-gray-500">Usage-based payment policy</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={false} />
        </div>

        <div className="flex gap-2">
          <ActionButton
            onClick={onExecute}
            loading={executingPayments.has(policy.publicKey.toString())}
            disabled={false}
            variant="primary"
            title="Execute payment"
          >
            <Play className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={onToggle}
            loading={togglingPolicies.has(policy.publicKey.toString())}
            disabled={false}
            variant="warning"
            title={status === 'active' ? 'Pause policy' : 'Resume policy'}
          >
            {status === 'active' ? <Pause className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </ActionButton>
          <ActionButton
            onClick={onDelete}
            loading={deletingPolicies.has(policy.publicKey.toString())}
            disabled={false}
            variant="danger"
            title="Delete policy"
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5 border border-emerald-100">
        <UsageGauge
          used={payg.currentPeriodTotal}
          limit={payg.maxAmountPerPeriod}
          formatAmount={(amt) => formatAmount(amt, tokenMint)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Period Started</div>
          <div className="text-sm font-medium text-gray-900">
            {periodStartDate ? periodStartDate.toLocaleDateString() : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Resets</div>
          <div className="text-sm font-medium text-gray-900">
            {periodEndDate ? formatDistanceToNow(periodEndDate, { addSuffix: true }) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Max per TX" value={formatAmount(payg.maxChunkAmount.toString(), tokenMint)} />
        <StatCard label="Total Paid" value={formatAmount(policy.account.totalPaid.toString(), tokenMint)} />
        <StatCard label="Payments" value={policy.account.paymentCount.toString()} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Policy Details</h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-indigo-100 rounded-full" />
        <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800 mb-1">Loading your policies</p>
        <p className="text-sm text-gray-500">Fetching payment data from Solana...</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 px-4">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
        <span className="text-4xl">📭</span>
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Payment Policies Yet</h2>
        <p className="text-gray-500 mb-6">
          You haven't set up any recurring payments. Create a subscription, milestone, or pay-as-you-go policy to get
          started.
        </p>
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>🔄</span> Subscriptions
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>🎯</span> Milestones
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>⚡</span> Pay-as-you-go
          </div>
        </div>
      </div>
    </div>
  )
}

function WalletNotConnected() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 px-4">
      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
        <AlertCircle className="w-12 h-12 text-indigo-600" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-500">Please connect your Solana wallet to view and manage your payment policies.</p>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [userPayments, setUserPayments] = useState<UserPaymentWithPolicies[]>([])
  const [selectedPolicy, setSelectedPolicy] = useState<{ publicKey: PublicKey; account: PaymentPolicy } | null>(null)
  const [executingPayments, setExecutingPayments] = useState<Set<string>>(new Set())
  const [togglingPolicies, setTogglingPolicies] = useState<Set<string>>(new Set())
  const [deletingPolicies, setDeletingPolicies] = useState<Set<string>>(new Set())
  const getTokenSymbol = useAtomValue(getTokenSymbolAtom)
  const getTokenPrecision = useAtomValue(getTokenPrecisionAtom)

  useEffect(() => {
    if (wallet.publicKey?.toString()) {
      setLoaded(false)
    }
  }, [wallet.publicKey])

  useEffect(() => {
    const fetchPolicies = async () => {
      if (!sdk || loaded) return
      if (!wallet.publicKey) return
      try {
        setLoading(true)
        const allUserPayments = await sdk.getAllUserPaymentsByOwner(wallet.publicKey)
        const userPaymentMap = new Map<string, UserPaymentWithPolicies>()

        for (const userPayment of allUserPayments) {
          const policies = await sdk.getPaymentPoliciesByUser(userPayment.publicKey)
          for (const policy of policies) {
            const userPaymentAddress = policy.account.userPayment.toString()
            if (!userPaymentMap.has(userPaymentAddress)) {
              const fetchedUserPayment = await sdk.getUserPayment(policy.account.userPayment)
              if (fetchedUserPayment) {
                if (fetchedUserPayment.owner.toString() !== wallet.publicKey.toString()) {
                  continue
                }
                userPaymentMap.set(userPaymentAddress, {
                  userPaymentAddress: policy.account.userPayment,
                  userPayment: fetchedUserPayment,
                  policies: [],
                })
              }
            }
            const entry = userPaymentMap.get(userPaymentAddress)
            if (entry) {
              entry.policies.push(policy)
            }
          }
        }

        setUserPayments(Array.from(userPaymentMap.values()))

        const allPolicies = Array.from(userPaymentMap.values()).flatMap((up) => up.policies)
        if (allPolicies.length > 0 && !selectedPolicy) {
          setSelectedPolicy(allPolicies[0])
        }

        setLoaded(true)
      } catch (err) {
        console.error('Error fetching payment policies:', err)
        toast.error('Failed to load payment policies')
      } finally {
        setLoading(false)
      }
    }
    fetchPolicies()
  }, [sdk, loaded, connection, wallet.publicKey, selectedPolicy])

  const formatAmount = (rawAmount: string | null, tokenMint: PublicKey): string => {
    if (!rawAmount) return 'N/A'
    const symbol = getTokenSymbol(tokenMint.toString())
    const precision = getTokenPrecision(tokenMint.toString())
    const amount = Number(rawAmount) / Math.pow(10, precision)
    const formattedAmount = amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    })
    return `${formattedAmount} ${symbol}`
  }

  const getInterval = (policy: PaymentPolicy): string => {
    const policyType = policy.policyType as Record<string, unknown>
    let intervalSeconds = 0

    if (policyType.subscription) {
      const paymentFrequency = (policyType.subscription as Record<string, unknown>).paymentFrequency as Record<
        string,
        unknown
      >
      const frequencyKey = Object.keys(paymentFrequency)[0]
      switch (frequencyKey) {
        case 'daily':
        case 'weekly':
        case 'monthly':
        case 'quarterly':
        case 'semiAnnually':
        case 'annually':
          return frequencyKey
        case 'custom':
          intervalSeconds = ((paymentFrequency.custom as Record<string, unknown>)[0] as anchor.BN).toNumber()
          break
        default:
          intervalSeconds = 0
      }
    }

    if (intervalSeconds === 0) return 'N/A'
    const duration = intervalToDuration({ start: 0, end: intervalSeconds * 1000 })
    return formatDuration(duration, { format: ['days', 'hours', 'minutes'] })
  }

  const getNextPaymentDue = (policy: PaymentPolicy): string => {
    if ('subscription' in policy.policyType) {
      const subscription = policy.policyType.subscription
      if (subscription?.nextPaymentDue) {
        const nextPaymentDate = new Date(subscription.nextPaymentDue.toNumber() * 1000)
        return nextPaymentDate < new Date() ? 'Overdue' : formatDistanceToNow(nextPaymentDate, { addSuffix: true })
      }
    }
    if ('milestone' in policy.policyType) {
      const milestone = policy.policyType.milestone
      if (milestone && milestone.currentMilestone < milestone.totalMilestones) {
        const nextTimestamp = milestone.milestoneTimestamps[milestone.currentMilestone]
        if (nextTimestamp && nextTimestamp.toNumber() > 0) {
          const nextPaymentDate = new Date(nextTimestamp.toNumber() * 1000)
          return nextPaymentDate < new Date() ? 'Overdue' : formatDistanceToNow(nextPaymentDate, { addSuffix: true })
        }
      }
      return 'Completed'
    }
    if ('payAsYouGo' in policy.policyType) {
      return 'On-demand'
    }
    return 'N/A'
  }

  const isPaymentDue = (policy: PaymentPolicy): boolean => {
    if ('subscription' in policy.policyType) {
      const subscription = policy.policyType.subscription
      if (subscription?.nextPaymentDue) {
        return new Date(subscription.nextPaymentDue.toNumber() * 1000) <= new Date()
      }
    }
    if ('milestone' in policy.policyType) {
      const milestone = policy.policyType.milestone
      if (milestone && milestone.currentMilestone < milestone.totalMilestones) {
        const nextTimestamp = milestone.milestoneTimestamps[milestone.currentMilestone]
        if (nextTimestamp && nextTimestamp.toNumber() > 0) {
          return new Date(nextTimestamp.toNumber() * 1000) <= new Date()
        }
      }
    }
    return false
  }

  const handleExecutePayment = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey || !wallet.connected) return toast.error('Wallet not connected')
    try {
      const gateway: PaymentGateway | null = await sdk.getPaymentGateway(policy.gateway)
      if (!gateway) return toast.error('Gateway not found')
      if (
        gateway.authority.toString() !== wallet.publicKey.toString() &&
        userPayment.owner.toString() !== wallet.publicKey.toString()
      ) {
        return toast.error('Only the gateway authority can execute payments')
      }
      setExecutingPayments((prev) => new Set(prev).add(policyPublicKey.toString()))
      const executeIxs = await sdk.executePayment(policyPublicKey)
      const txid = await createAndSendTransaction(executeIxs, wallet, connection)
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
    if (!sdk || !wallet.publicKey || !wallet.connected) return toast.error('Wallet not connected')
    if (userPayment.owner.toString() !== wallet.publicKey.toString()) {
      return toast.error('Only the policy owner can change status')
    }
    try {
      setTogglingPolicies((prev) => new Set(prev).add(policyPublicKey.toString()))
      const currentStatus = policy.status as Record<string, unknown>
      const isCurrentlyActive = currentStatus.active
      const newStatus = isCurrentlyActive ? { paused: {} } : { active: {} }
      const toggleIx = await sdk.changePaymentPolicyStatus(userPayment.tokenMint, policy.policyId, newStatus)
      await createAndSendTransaction([toggleIx], wallet, connection)
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
    if (!sdk || !wallet.publicKey || !wallet.connected) return toast.error('Wallet not connected')
    if (userPayment.owner.toString() !== wallet.publicKey.toString()) {
      return toast.error('Only the policy owner can delete')
    }
    if (!confirm('Delete this payment policy? This cannot be undone.')) return
    try {
      setDeletingPolicies((prev) => new Set(prev).add(policyPublicKey.toString()))
      const deleteIx = await sdk.deletePaymentPolicy(userPayment.tokenMint, policy.policyId)
      await createAndSendTransaction([deleteIx], wallet, connection)
      toast.success('Payment policy deleted!')
      setSelectedPolicy(null)
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
    return <WalletNotConnected />
  }

  if (loading) {
    return <LoadingState />
  }

  if (userPayments.length < 1) {
    return <EmptyState />
  }

  const currentUserPayment = selectedPolicy
    ? userPayments.find((up) => up.policies.some((p) => p.publicKey.toString() === selectedPolicy.publicKey.toString()))
    : null

  const totalPolicies = userPayments.reduce((sum, up) => sum + up.policies.length, 0)

  return (
    <div className="flex flex-col md:flex-row min-h-[600px] bg-white">
      <div className="w-full md:w-[380px] md:min-w-[380px] border-r border-gray-200 bg-gray-50/50 flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">My Policies</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
              {totalPolicies}
            </span>
          </div>
          <button
            onClick={() => setLoaded(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh policies"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {userPayments.map(({ policies, userPayment, userPaymentAddress }) => (
            <div key={userPaymentAddress.toString()}>
              <div className="sticky top-0 z-10 h-10 flex items-center px-4 bg-gray-100/90 backdrop-blur-sm border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {getTokenSymbol(userPayment.tokenMint.toString())}
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  ({policies.length} {policies.length === 1 ? 'policy' : 'policies'})
                </span>
              </div>

              {policies.map((policy) => (
                <PolicyCard
                  key={policy.publicKey.toString()}
                  policy={policy}
                  userPayment={userPayment}
                  isSelected={selectedPolicy?.publicKey.toString() === policy.publicKey.toString()}
                  onClick={() => setSelectedPolicy(policy)}
                  formatAmount={formatAmount}
                  getNextPaymentDue={getNextPaymentDue}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {selectedPolicy && currentUserPayment ? (
          <>
            {'subscription' in selectedPolicy.account.policyType && (
              <SubscriptionDetailPanel
                policy={selectedPolicy}
                userPayment={currentUserPayment}
                formatAmount={formatAmount}
                getInterval={getInterval}
                getNextPaymentDue={getNextPaymentDue}
                isPaymentDue={isPaymentDue(selectedPolicy.account)}
                onExecute={() =>
                  handleExecutePayment(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                onToggle={() =>
                  handleToggleStatus(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                onDelete={() =>
                  handleDeletePolicy(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                executingPayments={executingPayments}
                togglingPolicies={togglingPolicies}
                deletingPolicies={deletingPolicies}
              />
            )}
            {'milestone' in selectedPolicy.account.policyType && (
              <MilestoneDetailPanel
                policy={selectedPolicy}
                userPayment={currentUserPayment}
                formatAmount={formatAmount}
                getInterval={getInterval}
                getNextPaymentDue={getNextPaymentDue}
                isPaymentDue={isPaymentDue(selectedPolicy.account)}
                onExecute={() =>
                  handleExecutePayment(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                onToggle={() =>
                  handleToggleStatus(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                onDelete={() =>
                  handleDeletePolicy(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                executingPayments={executingPayments}
                togglingPolicies={togglingPolicies}
                deletingPolicies={deletingPolicies}
              />
            )}
            {'payAsYouGo' in selectedPolicy.account.policyType && (
              <PayAsYouGoDetailPanel
                policy={selectedPolicy}
                userPayment={currentUserPayment}
                formatAmount={formatAmount}
                getInterval={getInterval}
                getNextPaymentDue={getNextPaymentDue}
                isPaymentDue={isPaymentDue(selectedPolicy.account)}
                onExecute={() =>
                  handleExecutePayment(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                onToggle={() =>
                  handleToggleStatus(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                onDelete={() =>
                  handleDeletePolicy(selectedPolicy.publicKey, selectedPolicy.account, currentUserPayment.userPayment)
                }
                executingPayments={executingPayments}
                togglingPolicies={togglingPolicies}
                deletingPolicies={deletingPolicies}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <span className="text-4xl mb-4 block">👈</span>
              <p>Select a policy to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
