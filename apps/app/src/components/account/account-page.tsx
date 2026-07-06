import { useState, useEffect, useMemo } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { decodeMemo, type PaymentPolicy, type UserPayment, type PaymentGateway } from '@tributary-so/sdk'
import {
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Target,
  Zap,
  Inbox,
  Send,
  ArrowUp,
} from '../../icons'
import { addToast } from '@heroui/react'
import { formatDistanceToNow, formatDuration, intervalToDuration, differenceInSeconds, addSeconds } from 'date-fns'
import { PublicKeyComponent } from '../ui/public-key'
import { getTokenPrecisionAtom, getTokenSymbolAtom, setTokenMetadataAtom, tokenMetadataAtom } from '@/lib/token-store'
import { useAtomValue, useSetAtom } from 'jotai'
import { useResolveMints } from '@tributary-so/tokens-client/react'
import { API_BASE_URL } from '@/lib/api'

interface UserPaymentWithPolicies {
  userPaymentAddress: PublicKey
  userPayment: UserPayment
  policies: Array<{ publicKey: PublicKey; account: PaymentPolicy }>
}

type PolicyTypeKey = 'subscription' | 'milestone' | 'payAsYouGo' | 'oneTime' | 'upTo'
type StatusKey = 'active' | 'paused' | 'cancelled' | 'completed'

function getPolicyTypeKey(policy: PaymentPolicy): PolicyTypeKey {
  if ('subscription' in policy.policyType) return 'subscription'
  if ('milestone' in policy.policyType) return 'milestone'
  if ('oneTime' in policy.policyType) return 'oneTime'
  if ('upTo' in policy.policyType) return 'upTo'
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
    Icon: React.ComponentType<{ className?: string }>
    label: string
    color: string
    bgColor: string
    borderColor: string
    description: string
  }
> = {
  subscription: {
    Icon: RefreshCw,
    label: 'Subscription',
    color: 'text-subscription-700',
    bgColor: 'bg-subscription-50',
    borderColor: 'border-subscription-200',
    description: 'Recurring payments',
  },
  milestone: {
    Icon: Target,
    label: 'Milestone',
    color: 'text-milestone-700',
    bgColor: 'bg-milestone-50',
    borderColor: 'border-milestone-200',
    description: 'Stage-based payments',
  },
  payAsYouGo: {
    Icon: Zap,
    label: 'Pay-as-you-go',
    color: 'text-payasyougo-700',
    bgColor: 'bg-payasyougo-50',
    borderColor: 'border-payasyougo-200',
    description: 'Usage-based payments',
  },
  oneTime: {
    Icon: Send,
    label: 'One-time',
    color: 'text-oneTime-700',
    bgColor: 'bg-oneTime-50',
    borderColor: 'border-oneTime-200',
    description: 'Single payment',
  },
  upTo: {
    Icon: ArrowUp,
    label: 'Up to',
    color: 'text-upTo-700',
    bgColor: 'bg-upTo-50',
    borderColor: 'border-upTo-200',
    description: 'Variable-amount single settlement',
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
    color: 'text-status-active-700',
    bgColor: 'bg-status-active-50',
    dotColor: 'bg-status-active-500',
  },
  paused: {
    label: 'Paused',
    color: 'text-status-paused-700',
    bgColor: 'bg-status-paused-50',
    dotColor: 'bg-status-paused-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    dotColor: 'bg-muted-foreground',
  },
  completed: {
    label: 'Completed',
    color: 'text-completed-700',
    bgColor: 'bg-completed-50',
    dotColor: 'bg-completed-500',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-overdue-700',
    bgColor: 'bg-overdue-50',
    dotColor: 'bg-overdue-500',
  },
}

function StatusBadge({ status, isOverdue }: { status: StatusKey; isOverdue: boolean }) {
  const config = isOverdue && status === 'active' ? STATUS_CONFIG.overdue : STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <span className={`w-1.5 h-1.5 ${config.dotColor} ${status === 'active' && !isOverdue ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}

function PolicyTypeBadge({ type }: { type: PolicyTypeKey }) {
  const config = POLICY_TYPE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}
    >
      <config.Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function CircularProgress({
  progress,
  size = 48,
  colorClass = 'text-subscription-600',
}: {
  progress: number
  size?: number
  colorClass?: string
}) {
  const strokeWidth = size > 50 ? 4 : 3
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-500 ease-out`}
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
        <span className={`font-semibold text-foreground ${size > 50 ? 'text-xs' : 'text-[10px]'}`}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

function ProgressBar({ progress, color = 'bg-subscription-600' }: { progress: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-muted/30 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500 ease-out`}
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
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-semibold text-milestone-700">
          {currentMilestone} / {totalMilestones} completed
        </span>
      </div>

      {/* Mobile: Vertical list layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {Array.from({ length: totalMilestones }).map((_, i) => {
          const isCompleted = i < currentMilestone
          const isCurrent = i === currentMilestone
          const amount = milestoneAmounts[i]
          const timestamp = milestoneTimestamps[i]
          const isDue = timestamp && timestamp.toNumber() > 0 && new Date(timestamp.toNumber() * 1000) <= new Date()

          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-2 ${
                isCurrent ? 'bg-milestone-50 border border-milestone-200' : 'bg-muted/30'
              }`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0
                  ${
                    isCompleted
                      ? 'bg-milestone-500 text-white'
                      : isCurrent
                      ? 'bg-milestone-100 text-milestone-700 ring-2 ring-milestone-500'
                      : 'bg-muted text-muted-foreground'
                  }
                  ${isDue && !isCompleted ? 'ring-2 ring-overdue-400' : ''}`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-xs font-medium truncate ${
                    isCompleted ? 'text-muted-foreground' : isCurrent ? 'text-milestone-700' : 'text-muted-foreground'
                  }`}
                >
                  {amount && !amount.isZero() ? formatAmount(amount.toString()) : 'No amount'}
                </div>
                {timestamp && timestamp.toNumber() > 0 && !isCompleted && (
                  <div className={`text-[10px] ${isDue ? 'text-overdue-600 font-medium' : 'text-muted-foreground'}`}>
                    {isDue
                      ? 'Due now'
                      : formatDistanceToNow(new Date(timestamp.toNumber() * 1000), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: Horizontal tracker layout */}
      <div className="hidden sm:flex items-center gap-1">
        {Array.from({ length: totalMilestones }).map((_, i) => {
          const isCompleted = i < currentMilestone
          const isCurrent = i === currentMilestone
          const amount = milestoneAmounts[i]
          const timestamp = milestoneTimestamps[i]
          const isDue = timestamp && timestamp.toNumber() > 0 && new Date(timestamp.toNumber() * 1000) <= new Date()

          return (
            <div key={i} className="flex-1 group relative">
              {i > 0 && (
                <div
                  className={`absolute top-3 -left-1 w-2 h-0.5 ${isCompleted ? 'bg-milestone-500' : 'bg-muted/30'}`}
                />
              )}

              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 flex items-center justify-center text-xs font-bold transition-all
                    ${
                      isCompleted
                        ? 'bg-milestone-500 text-white'
                        : isCurrent
                        ? 'bg-milestone-100 text-milestone-700 ring-2 ring-milestone-500'
                        : 'bg-muted text-muted-foreground'
                    }
                    ${isDue && !isCompleted ? 'ring-2 ring-overdue-400' : ''}`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>

                <span
                  className={`mt-1 text-xs ${
                    isCompleted
                      ? 'text-muted-foreground'
                      : isCurrent
                      ? 'text-milestone-700 font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {amount && !amount.isZero() ? formatAmount(amount.toString()) : '-'}
                </span>

                {timestamp && timestamp.toNumber() > 0 && !isCompleted && (
                  <span className={`text-[10px] ${isDue ? 'text-overdue-600 font-medium' : 'text-muted-foreground'}`}>
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
    if (percentage >= 90) return 'text-overdue-600'
    if (percentage >= 70) return 'text-status-paused-600'
    return 'text-payasyougo-600'
  }

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-overdue-500'
    if (percentage >= 70) return 'bg-status-paused-500'
    return 'bg-payasyougo-500'
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-muted-foreground">Usage this period</span>
        <span className={`text-base sm:text-lg font-bold ${getColor()}`}>{percentage.toFixed(1)}%</span>
      </div>

      <ProgressBar progress={percentage} color={getBarColor()} />

      <div className="flex flex-col xs:flex-row justify-between gap-0.5 xs:gap-0 text-[10px] sm:text-xs text-muted-foreground">
        <span className="truncate">Used: {formatAmount(used.toString())}</span>
        <span className="truncate">Limit: {formatAmount(limit.toString())}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="bg-muted/30 p-2 sm:p-3 border border-border">
      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">{label}</div>
      <div className="text-sm sm:text-lg font-semibold text-foreground truncate">{value}</div>
      {sublabel && <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{sublabel}</div>}
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
    primary:
      'border-subscription-600 text-subscription-600 hover:bg-subscription-600 hover:text-white active:bg-subscription-700',
    warning:
      'border-status-paused-500 text-status-paused-500 hover:bg-status-paused-500 hover:text-white active:bg-status-paused-600',
    danger: 'border-overdue-500 text-overdue-500 hover:bg-overdue-500 hover:text-white active:bg-overdue-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`p-2 sm:p-2.5 border-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation ${variants[variant]}`}
    >
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" /> : children}
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
    <button onClick={handleCopy} className="p-1.5 hover:bg-muted transition-colors" title={`Copy ${label}`}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-status-active-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-border last:border-0 gap-0.5 sm:gap-0">
      <span className="sm:min-w-[140px] text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs sm:text-sm text-foreground truncate font-mono">{value}</span>
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
    if ('oneTime' in policy.account.policyType) {
      const oneTime = policy.account.policyType.oneTime
      // A one-time policy is "overdue" only when due_date is positive and past.
      // Immediate (due_date <= 0) policies just show "Due now" — not red.
      if (oneTime && oneTime.dueDate && oneTime.dueDate.toNumber() > 0) {
        return new Date(oneTime.dueDate.toNumber() * 1000) < new Date()
      }
    }
    if ('upTo' in policy.account.policyType) {
      const upTo = policy.account.policyType.upTo
      if (upTo && upTo.deadline && upTo.deadline.toNumber() > 0) {
        return new Date(upTo.deadline.toNumber() * 1000) < new Date()
      }
    }
    return false
  }, [policy.account])

  const memo = decodeMemo(policy.account.memo || [])

  return (
    <div
      onClick={onClick}
      className={`
        relative p-3 sm:p-4 cursor-pointer transition-all duration-200 border-b border-border
        hover:bg-muted/30 group active:bg-muted/50
        ${
          isSelected
            ? 'bg-linear-to-r from-subscription-50 to-background border-l-4 border-l-subscription-600'
            : 'border-l-4 border-l-transparent'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <PolicyTypeBadge type={policyType} />
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              ID: {policy.account.policyId}
            </div>
          </div>
        </div>
        <StatusBadge status={statusKey} isOverdue={isOverdue} />
      </div>

      <div className="text-xs sm:text-sm font-medium text-foreground mb-1 truncate">{memo || 'Untitled Policy'}</div>

      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-2 min-w-0">
        <span className="shrink-0">To:</span>
        <span className="truncate">
          <PublicKeyComponent publicKey={policy.account.recipient} />
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] sm:text-xs gap-2">
        <span className="text-muted-foreground shrink-0">
          {policy.account.paymentCount} payment{policy.account.paymentCount !== 1 ? 's' : ''}
        </span>
        <span className={`font-medium truncate ${isOverdue ? 'text-overdue-600' : 'text-muted-foreground'}`}>
          {getNextPaymentDue(policy.account)}
        </span>
      </div>

      {isSelected && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-subscription-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
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
  referralAccounts: Map<string, any>
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
    referralAccounts,
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <RefreshCw className="w-7 h-7 text-subscription-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Subscription</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Recurring payment policy</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={!!isOverdue} />
        </div>

        <div className="flex gap-2 self-start">
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

      <div className="bg-linear-to-br from-subscription-50 to-subscription-100/50 p-4 sm:p-5 border border-subscription-100">
        <div className="text-xs sm:text-sm text-subscription-600 font-medium mb-1">Payment Amount</div>
        <div className="text-2xl sm:text-3xl font-bold text-subscription-900 mb-1 sm:mb-2 truncate">
          {formatAmount(sub.amount.toString(), tokenMint)}
        </div>
        <div className="text-xs sm:text-sm text-subscription-600">every {getInterval(policy.account)}</div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Time to next payment</span>
          <span className={`font-semibold ${isOverdue ? 'text-overdue-600' : 'text-subscription-700'}`}>
            {getNextPaymentDue(policy.account)}
          </span>
        </div>
        <ProgressBar progress={progressToNextPayment} color={isOverdue ? 'bg-overdue-500' : 'bg-subscription-600'} />
        <div className="flex flex-col xs:flex-row justify-between gap-0.5 xs:gap-0 text-[10px] sm:text-xs text-muted-foreground">
          <span>Last: {lastPaymentDate ? formatDistanceToNow(lastPaymentDate, { addSuffix: true }) : 'Never'}</span>
          <span>Next: {nextPaymentDate ? nextPaymentDate.toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total Paid" value={formatAmount(policy.account.totalPaid.toString(), tokenMint)} />
        <StatCard label="Payments" value={policy.account.paymentCount.toString()} />
        <StatCard label="Auto-Renew" value={sub.autoRenew ? 'Yes' : 'No'} />
      </div>

      <div className="border-t border-border pt-3 sm:pt-4">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground mb-2 sm:mb-3">
          Policy Details
        </h3>
        <div className="bg-muted/30 p-2 sm:p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          <DetailRow
            label="Created"
            value={new Date(userPayment.userPayment.createdAt.toNumber() * 1000).toLocaleString()}
          />
          {(() => {
            const referralAccount = referralAccounts.get(policy.account.gateway.toString())
            return referralAccount ? (
              <DetailRow label="Referral Code" value={decodeMemo(referralAccount.referralCode)} copyable />
            ) : null
          })()}
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
    referralAccounts,
  } = props
  const milestone = policy.account.policyType.milestone!
  const tokenMint = userPayment.userPayment.tokenMint
  const status = getStatusKey(policy.account)

  const totalAmount = milestone.milestoneAmounts.reduce(
    (sum: anchor.BN, amt: anchor.BN) => sum.add(amt),
    new anchor.BN(0),
  )
  const completedAmount = milestone.milestoneAmounts
    .slice(0, milestone.currentMilestone)
    .reduce((sum: anchor.BN, amt: anchor.BN) => sum.add(amt), new anchor.BN(0))

  const progressPercent = (milestone.currentMilestone / milestone.totalMilestones) * 100

  const releaseConditions = ['Time-based', 'Manual Approval', 'Automatic']
  const releaseCondition = releaseConditions[milestone.releaseCondition] || 'Unknown'

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Target className="w-7 h-7 text-milestone-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Milestone Payment</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Stage-based payment policy</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={false} />
        </div>

        <div className="flex gap-2 self-start">
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

      <div className="bg-linear-to-br from-milestone-50 to-milestone-100/50 p-4 sm:p-5 border border-milestone-100">
        <div className="flex items-center justify-between mb-2 sm:mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm text-milestone-600 font-medium mb-1">Total Value</div>
            <div className="text-xl sm:text-3xl font-bold text-milestone-900 truncate">
              {formatAmount(totalAmount.toString(), tokenMint)}
            </div>
          </div>
          <div className="shrink-0">
            <CircularProgress progress={progressPercent} size={56} colorClass="text-milestone-600" />
          </div>
        </div>
        <div className="text-xs sm:text-sm text-milestone-600 truncate">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Next Due" value={getNextPaymentDue(policy.account)} />
        <StatCard label="Release Type" value={releaseCondition} />
        <StatCard label="Payments Made" value={policy.account.paymentCount.toString()} />
      </div>

      <div className="border-t border-border pt-3 sm:pt-4">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground mb-2 sm:mb-3">
          Policy Details
        </h3>
        <div className="bg-muted/30 p-2 sm:p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          <DetailRow label="Escrow Amount" value={formatAmount(milestone.escrowAmount.toString(), tokenMint)} />
          {(() => {
            const referralAccount = referralAccounts.get(policy.account.gateway.toString())
            return referralAccount ? (
              <DetailRow label="Referral Code" value={decodeMemo(referralAccount.referralCode)} copyable />
            ) : null
          })()}
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
    referralAccounts,
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Zap className="w-7 h-7 text-payasyougo-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Pay-as-you-go</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Usage-based payment policy</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={false} />
        </div>

        <div className="flex gap-2 self-start">
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

      <div className="bg-linear-to-br from-payasyougo-50 to-payasyougo-100/50 p-4 sm:p-5 border border-payasyougo-100">
        <UsageGauge
          used={payg.currentPeriodTotal}
          limit={payg.maxAmountPerPeriod}
          formatAmount={(amt) => formatAmount(amt, tokenMint)}
        />
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-muted/30 p-3 sm:p-4 border border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">
            Period Started
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground">
            {periodStartDate ? periodStartDate.toLocaleDateString() : 'N/A'}
          </div>
        </div>
        <div className="bg-muted/30 p-3 sm:p-4 border border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">
            Resets
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground">
            {periodEndDate ? formatDistanceToNow(periodEndDate, { addSuffix: true }) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Max per TX" value={formatAmount(payg.maxChunkAmount.toString(), tokenMint)} />
        <StatCard label="Total Paid" value={formatAmount(policy.account.totalPaid.toString(), tokenMint)} />
        <StatCard label="Payments" value={policy.account.paymentCount.toString()} />
      </div>

      <div className="border-t border-border pt-3 sm:pt-4">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground mb-2 sm:mb-3">
          Policy Details
        </h3>
        <div className="bg-muted/30 p-2 sm:p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          {(() => {
            const referralAccount = referralAccounts.get(policy.account.gateway.toString())
            return referralAccount ? (
              <DetailRow label="Referral Code" value={decodeMemo(referralAccount.referralCode)} copyable />
            ) : null
          })()}
        </div>
      </div>
    </div>
  )
}

function OneTimeDetailPanel(props: DetailPanelProps) {
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
    referralAccounts,
  } = props
  const oneTime = policy.account.policyType.oneTime!
  const tokenMint = userPayment.userPayment.tokenMint
  const status = getStatusKey(policy.account)
  const isCompleted = status === 'completed'

  const dueDate = oneTime.dueDate && oneTime.dueDate.toNumber() > 0 ? new Date(oneTime.dueDate.toNumber() * 1000) : null
  const expiryDate = oneTime.expiryDate ? new Date(oneTime.expiryDate.toNumber() * 1000) : null
  const now = new Date()
  const isExpired = !isCompleted && expiryDate !== null && expiryDate < now
  const isOverdue = !isCompleted && dueDate !== null && dueDate < now && !isExpired

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Send className="w-7 h-7 text-oneTime-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">One-time Payment</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Single fixed-amount payment</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={isOverdue || isExpired} />
        </div>

        <div className="flex gap-2 self-start">
          <ActionButton
            onClick={onExecute}
            loading={executingPayments.has(policy.publicKey.toString())}
            disabled={!isPaymentDue || isCompleted}
            variant="primary"
            title={
              isCompleted
                ? 'Already executed'
                : isExpired
                ? 'Policy expired'
                : isPaymentDue
                ? 'Execute payment'
                : 'Not due yet'
            }
          >
            <Play className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={onToggle}
            loading={togglingPolicies.has(policy.publicKey.toString())}
            disabled={isCompleted}
            variant="warning"
            title={
              isCompleted
                ? 'Completed policies cannot be paused'
                : status === 'active'
                ? 'Pause policy'
                : 'Resume policy'
            }
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

      <div className="bg-linear-to-br from-oneTime-50 to-oneTime-100/50 p-4 sm:p-5 border border-oneTime-100">
        <div className="text-xs sm:text-sm text-oneTime-600 font-medium mb-1">Payment Amount</div>
        <div className="text-2xl sm:text-3xl font-bold text-oneTime-900 mb-1 sm:mb-2 truncate">
          {formatAmount(oneTime.amount.toString(), tokenMint)}
        </div>
        <div className="text-xs sm:text-sm text-oneTime-600">
          {isCompleted ? 'Paid out' : getNextPaymentDue(policy.account)}
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-muted/30 p-3 sm:p-4 border border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">
            Due Date
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground">
            {dueDate ? dueDate.toLocaleString() : 'Immediate'}
          </div>
        </div>
        <div className="bg-muted/30 p-3 sm:p-4 border border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">
            Expires
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground">
            {expiryDate ? expiryDate.toLocaleString() : 'Never'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total Paid" value={formatAmount(policy.account.totalPaid.toString(), tokenMint)} />
        <StatCard label="Payments" value={policy.account.paymentCount.toString()} />
        <StatCard label="Status" value={isCompleted ? 'Done' : isExpired ? 'Expired' : 'Pending'} />
      </div>

      <div className="border-t border-border pt-3 sm:pt-4">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground mb-2 sm:mb-3">
          Policy Details
        </h3>
        <div className="bg-muted/30 p-2 sm:p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          {(() => {
            const referralAccount = referralAccounts.get(policy.account.gateway.toString())
            return referralAccount ? (
              <DetailRow label="Referral Code" value={decodeMemo(referralAccount.referralCode)} copyable />
            ) : null
          })()}
        </div>
      </div>
    </div>
  )
}

function UpToDetailPanel(props: DetailPanelProps) {
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
    referralAccounts,
  } = props
  const upTo = policy.account.policyType.upTo!
  const tokenMint = userPayment.userPayment.tokenMint
  const status = getStatusKey(policy.account)
  const isCompleted = status === 'completed'

  const validAfter = upTo.validAfter.toNumber() > 0 ? new Date(upTo.validAfter.toNumber() * 1000) : null
  const deadline = upTo.deadline.toNumber() > 0 ? new Date(upTo.deadline.toNumber() * 1000) : null
  const now = new Date()
  const isExpired = !isCompleted && deadline !== null && deadline < now
  const isOverdue = !isCompleted && deadline !== null && deadline < now

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <ArrowUp className="w-7 h-7 text-upTo-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Up to Payment</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Variable-amount single settlement</p>
            </div>
          </div>
          <StatusBadge status={status} isOverdue={isOverdue || isExpired} />
        </div>

        <div className="flex gap-2 self-start">
          <ActionButton
            onClick={onExecute}
            loading={executingPayments.has(policy.publicKey.toString())}
            disabled={!isPaymentDue || isCompleted}
            variant="primary"
            title={
              isCompleted
                ? 'Already settled'
                : isExpired
                ? 'Policy expired'
                : isPaymentDue
                ? 'Execute settlement'
                : 'Not yet valid'
            }
          >
            <Play className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            onClick={onToggle}
            loading={togglingPolicies.has(policy.publicKey.toString())}
            disabled={isCompleted}
            variant="warning"
            title={
              isCompleted
                ? 'Completed policies cannot be paused'
                : status === 'active'
                ? 'Pause policy'
                : 'Resume policy'
            }
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

      <div className="bg-linear-to-br from-upTo-50 to-upTo-100/50 p-4 sm:p-5 border border-upTo-100">
        <div className="text-xs sm:text-sm text-upTo-600 font-medium mb-1">Maximum Amount</div>
        <div className="text-2xl sm:text-3xl font-bold text-upTo-900 mb-1 sm:mb-2 truncate">
          {formatAmount(upTo.maxAmount.toString(), tokenMint)}
        </div>
        <div className="text-xs sm:text-sm text-upTo-600">
          {isCompleted ? 'Settled' : getNextPaymentDue(policy.account)}
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-muted/30 p-3 sm:p-4 border border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">
            Valid After
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground">
            {validAfter ? validAfter.toLocaleString() : 'Immediate'}
          </div>
        </div>
        <div className="bg-muted/30 p-3 sm:p-4 border border-border">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">
            Deadline
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground">
            {deadline ? deadline.toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total Paid" value={formatAmount(policy.account.totalPaid.toString(), tokenMint)} />
        <StatCard label="Payments" value={policy.account.paymentCount.toString()} />
        <StatCard label="Status" value={isCompleted ? 'Done' : isExpired ? 'Expired' : 'Pending'} />
      </div>

      <div className="border-t border-border pt-3 sm:pt-4">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground mb-2 sm:mb-3">
          Policy Details
        </h3>
        <div className="bg-muted/30 p-2 sm:p-3 space-y-1">
          <DetailRow label="Policy Address" value={policy.publicKey.toString()} copyable />
          <DetailRow label="Recipient" value={policy.account.recipient.toString()} copyable />
          <DetailRow label="Gateway" value={policy.account.gateway.toString()} copyable />
          <DetailRow label="Token Mint" value={tokenMint.toString()} copyable />
          {(() => {
            const referralAccount = referralAccounts.get(policy.account.gateway.toString())
            return referralAccount ? (
              <DetailRow label="Referral Code" value={decodeMemo(referralAccount.referralCode)} copyable />
            ) : null
          })()}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] gap-4 sm:gap-6 px-4">
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-muted" />
        <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 border-4 border-subscription-600 border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-base sm:text-lg font-semibold text-foreground mb-1">Loading your policies</p>
        <p className="text-xs sm:text-sm text-muted-foreground">Fetching payment data from Solana...</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] gap-4 sm:gap-6 px-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted flex items-center justify-center">
        <Inbox className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">No Payment Policies Yet</h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
          You haven't set up any payment policies yet. Create a subscription, milestone, pay-as-you-go, one-time, or
          up-to policy to get started.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4" /> Subscriptions
          </div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Target className="w-4 h-4" /> Milestones
          </div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Zap className="w-4 h-4" /> Pay-as-you-go
          </div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Send className="w-4 h-4" /> One-time
          </div>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <ArrowUp className="w-4 h-4" /> Up-to
          </div>
        </div>
      </div>
    </div>
  )
}

function WalletNotConnected() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] gap-4 sm:gap-6 px-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-subscription-50 flex items-center justify-center">
        <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-subscription-600" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Please connect your Solana wallet to view and manage your payment policies.
        </p>
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
  const [referralAccounts, setReferralAccounts] = useState<Map<string, any>>(new Map())
  const getTokenSymbol = useAtomValue(getTokenSymbolAtom)
  const getTokenPrecision = useAtomValue(getTokenPrecisionAtom)
  const knownMints = useAtomValue(tokenMetadataAtom)
  const setTokenMetadata = useSetAtom(setTokenMetadataAtom)

  // D8 — collect every mint that appears in the wallet's payment policies,
  // resolve any not yet in the atom (and enrich those that are, idempotent
  // overwrite with richer data: logo, etc.).
  const walletMints = useMemo(() => {
    const set = new Set<string>()
    for (const up of userPayments) {
      set.add(up.userPayment.tokenMint.toBase58())
    }
    return Array.from(set)
  }, [userPayments])

  const resolveResults = useResolveMints(
    walletMints,
    { baseUrl: API_BASE_URL },
    {
      enabled: loaded && walletMints.length > 0,
    },
  )

  useEffect(() => {
    // Walk resolved data in input order; write any non-null result back.
    for (let i = 0; i < resolveResults.length; i++) {
      const r = resolveResults[i]
      const mint = walletMints[i]
      if (!r?.data || !mint) continue
      const d = r.data
      // Skip if the existing entry is already richer (e.g. user has a
      // devnet entry and the upstream returned a mismatched mainnet one).
      const existing = knownMints[mint]
      if (existing && existing.logoURI && !d.imageUrl) continue
      setTokenMetadata(mint, {
        symbol: d.symbol,
        name: d.name ?? existing?.name,
        decimals: d.decimals ?? existing?.decimals ?? 6,
        logoURI: d.imageUrl ?? existing?.logoURI,
        network: existing?.network,
      })
    }
  }, [resolveResults, walletMints, knownMints, setTokenMetadata])

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

        // Fetch referral accounts for unique gateways (once per gateway)
        const uniqueGateways = new Set<string>()
        for (const userPayment of Array.from(userPaymentMap.values())) {
          for (const policy of userPayment.policies) {
            uniqueGateways.add(policy.account.gateway.toString())
          }
        }

        const referralMap = new Map<string, any>()
        for (const gatewayKey of uniqueGateways) {
          try {
            const referralAccount = await sdk.getReferralAccountByOwner(new PublicKey(gatewayKey), wallet.publicKey)
            if (referralAccount) {
              referralMap.set(gatewayKey, referralAccount)
            }
          } catch (error) {
            console.error('Error fetching referral account for gateway:', gatewayKey, error)
          }
        }
        setReferralAccounts(referralMap)

        const allPolicies = Array.from(userPaymentMap.values()).flatMap((up) => up.policies)
        if (allPolicies.length > 0 && !selectedPolicy) {
          setSelectedPolicy(allPolicies[0])
        }

        setLoaded(true)
      } catch (err) {
        console.error('Error fetching payment policies:', err)
        addToast({ title: 'Failed to load payment policies', color: 'danger' })
        setLoaded(true)
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
    if ('oneTime' in policy.policyType) {
      const oneTime = policy.policyType.oneTime
      if (policy.status?.completed) return 'Completed'
      if (oneTime?.expiryDate) {
        const expiry = new Date(oneTime.expiryDate.toNumber() * 1000)
        if (expiry < new Date()) return 'Expired'
      }
      if (oneTime?.dueDate && oneTime.dueDate.toNumber() > 0) {
        const due = new Date(oneTime.dueDate.toNumber() * 1000)
        return due < new Date() ? 'Overdue' : formatDistanceToNow(due, { addSuffix: true })
      }
      return 'Due now'
    }
    if ('upTo' in policy.policyType) {
      const upTo = policy.policyType.upTo
      if (policy.status?.completed) return 'Completed'
      if (upTo?.deadline && upTo.deadline.toNumber() > 0) {
        const deadline = new Date(upTo.deadline.toNumber() * 1000)
        if (deadline < new Date()) return 'Expired'
        return formatDistanceToNow(deadline, { addSuffix: true })
      }
      return 'No deadline'
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
    if ('oneTime' in policy.policyType) {
      const oneTime = policy.policyType.oneTime
      if (!oneTime) return false
      // due_date <= 0 means immediate → due now.
      const dueOk = oneTime.dueDate.toNumber() <= 0 || new Date(oneTime.dueDate.toNumber() * 1000) <= new Date()
      if (!dueOk) return false
      // If expiry is set and past, the policy can no longer fire.
      if (oneTime.expiryDate && new Date(oneTime.expiryDate.toNumber() * 1000) < new Date()) return false
      return true
    }
    if ('upTo' in policy.policyType) {
      const upTo = policy.policyType.upTo
      if (!upTo) return false
      // valid_after <= 0 means immediate.
      const afterOk = upTo.validAfter.toNumber() <= 0 || new Date(upTo.validAfter.toNumber() * 1000) <= new Date()
      if (!afterOk) return false
      // If deadline is set and past, the policy can no longer fire.
      if (upTo.deadline.toNumber() > 0 && new Date(upTo.deadline.toNumber() * 1000) < new Date()) return false
      return true
    }
    return false
  }

  const handleExecutePayment = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey || !wallet.connected)
      return addToast({ title: 'Wallet not connected', color: 'danger' })
    try {
      const gateway: PaymentGateway | null = await sdk.getPaymentGateway(policy.gateway)
      if (!gateway) return addToast({ title: 'Gateway not found', color: 'danger' })
      if (
        gateway.authority.toString() !== wallet.publicKey.toString() &&
        userPayment.owner.toString() !== wallet.publicKey.toString()
      ) {
        return addToast({ title: 'Only the gateway authority can execute payments', color: 'danger' })
      }
      setExecutingPayments((prev) => new Set(prev).add(policyPublicKey.toString()))
      const executeIxs = await sdk.executePayment(policyPublicKey)
      const txid = await createAndSendTransaction(executeIxs, wallet, connection)
      addToast({ title: `Payment executed!", description: "TX: ${txid}`, color: 'success' })
      setLoaded(false)
    } catch (err) {
      console.error('Error:', err)
      addToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to execute payment',
        color: 'danger',
      })
    } finally {
      setExecutingPayments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(policyPublicKey.toString())
        return newSet
      })
    }
  }

  const handleToggleStatus = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey || !wallet.connected)
      return addToast({ description: 'Wallet not connected', color: 'danger' })
    if (userPayment.owner.toString() !== wallet.publicKey.toString()) {
      return addToast({ title: 'Only the policy owner can change status', color: 'danger' })
    }
    try {
      setTogglingPolicies((prev) => new Set(prev).add(policyPublicKey.toString()))
      const currentStatus = policy.status as Record<string, unknown>
      const isCurrentlyActive = currentStatus.active
      const newStatus = isCurrentlyActive ? { paused: {} } : { active: {} }
      const toggleIx = await sdk.changePaymentPolicyStatus(userPayment.tokenMint, policy.policyId, newStatus)
      await createAndSendTransaction([toggleIx], wallet, connection)
      addToast({ title: `Payment policy ${isCurrentlyActive ? 'paused' : 'resumed'}!`, color: 'success' })
      setLoaded(false)
    } catch (err) {
      console.error('Error:', err)
      addToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to toggle status',
        color: 'danger',
      })
    } finally {
      setTogglingPolicies((prev) => {
        const newSet = new Set(prev)
        newSet.delete(policyPublicKey.toString())
        return newSet
      })
    }
  }

  const handleDeletePolicy = async (policyPublicKey: PublicKey, policy: PaymentPolicy, userPayment: UserPayment) => {
    if (!sdk || !wallet.publicKey || !wallet.connected)
      return addToast({ description: 'Wallet not connected', color: 'danger' })
    if (userPayment.owner.toString() !== wallet.publicKey.toString()) {
      return addToast({ title: 'Only the policy owner can delete', color: 'danger' })
    }
    if (!confirm('Delete this payment policy? This cannot be undone.')) return
    try {
      setDeletingPolicies((prev) => new Set(prev).add(policyPublicKey.toString()))
      const deleteIx = await sdk.deletePaymentPolicy(userPayment.tokenMint, policy.policyId)
      await createAndSendTransaction([deleteIx], wallet, connection)
      addToast({ title: 'Payment policy deleted!', color: 'success' })
      setSelectedPolicy(null)
      setLoaded(false)
    } catch (err) {
      console.error('Error:', err)
      addToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete',
        color: 'danger',
      })
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
    <div className="flex flex-col lg:flex-row min-h-[500px] w-full lg:min-w-[600px] lg:max-w-[1100px] bg-background">
      <div
        className={`
          w-full lg:w-[320px] xl:w-[380px] lg:min-w-[320px] xl:min-w-[380px]
          border-b lg:border-b-0 lg:border-r border-border bg-muted/20
          flex flex-col
          ${selectedPolicy ? 'hidden lg:flex' : 'flex'}
        `}
      >
        <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-foreground">My Policies</span>
            <span className="px-1.5 sm:px-2 py-0.5 bg-muted text-[10px] sm:text-xs font-medium text-muted-foreground">
              {totalPolicies}
            </span>
          </div>
          <button
            onClick={() => setLoaded(false)}
            className="p-2 hover:bg-muted active:bg-muted/50 transition-colors touch-manipulation"
            title="Refresh policies"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 max-h-full lg:max-h-none">
          {userPayments.map(({ policies, userPayment, userPaymentAddress }) => (
            <div key={userPaymentAddress.toString()}>
              <div className="sticky top-0 z-10 h-8 sm:h-10 flex items-center px-3 sm:px-4 bg-muted/80 backdrop-blur-xs border-b border-border">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {getTokenSymbol(userPayment.tokenMint.toString())}
                </span>
                <span className="ml-2 text-[10px] sm:text-xs text-muted-foreground">
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

      <div className={`flex-1 overflow-y-auto bg-background ${!selectedPolicy ? 'hidden lg:flex' : 'flex flex-col'}`}>
        {selectedPolicy && currentUserPayment ? (
          <>
            <button
              onClick={() => setSelectedPolicy(null)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 text-sm font-medium text-subscription-600 hover:bg-subscription-50 border-b border-border touch-manipulation"
            >
              <span>←</span>
              <span>Back to policies</span>
            </button>
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
                referralAccounts={referralAccounts}
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
                referralAccounts={referralAccounts}
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
                referralAccounts={referralAccounts}
              />
            )}
            {'oneTime' in selectedPolicy.account.policyType && (
              <OneTimeDetailPanel
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
                referralAccounts={referralAccounts}
              />
            )}
            {'upTo' in selectedPolicy.account.policyType && (
              <UpToDetailPanel
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
                referralAccounts={referralAccounts}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <div className="text-center">
              <p className="text-sm sm:text-base">Select a policy to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
