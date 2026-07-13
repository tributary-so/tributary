import {Flags} from '@oclif/core'
import {encodeMemo, PaymentFrequency} from '@tributary-so/sdk'
import BN from 'bn.js'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

type Variant = 'milestone' | 'one-time' | 'pay-as-you-go' | 'subscription' | 'up-to'

export default class PaymentPolicyCreate extends BaseCommand {
  static description = 'Create a payment policy (subscription / milestone / pay-as-you-go / one-time / up-to)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --variant subscription -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000',
    '<%= config.bin %> <%= command.id %> --variant milestone -m <MINT> -r <RECIPIENT> -g <GATEWAY> --amounts 1000,2000 --timestamps 1700000000,1800000000 --release-condition 1',
    '<%= config.bin %> <%= command.id %> --variant pay-as-you-go -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-per-period 1000000 --max-chunk 100000 --period-seconds 86400',
    '<%= config.bin %> <%= command.id %> --variant one-time -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000',
    '<%= config.bin %> <%= command.id %> --variant one-time -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000 --due-date 1800000000 --expiry 1900000000',
    '<%= config.bin %> <%= command.id %> --variant up-to -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-amount 5000000 --deadline 1800000000',
    '<%= config.bin %> <%= command.id %> --variant up-to -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-amount 5000000 --valid-after 1700000000 --deadline 1800000000',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    // subscription
    amount: Flags.string({char: 'a', description: '[subscription, one-time] Amount in smallest token unit'}),
    // milestone
    amounts: Flags.string({description: '[milestone] Comma-separated milestone amounts (up to 4)'}),
    'auto-renew': Flags.boolean({allowNo: true, default: true, description: '[subscription] Auto-renew'}),
    deadline: Flags.string({
      description: '[up-to] Hard expiry timestamp; execution rejected at/after (unix seconds). Required for up-to',
    }),
    'due-date': Flags.string({
      description: '[one-time] Earliest execution timestamp (unix seconds); omitted/<=0 means immediate',
    }),
    expiry: Flags.string({
      description:
        '[pay-as-you-go, one-time] Optional overall expiry (unix seconds); execution rejected after this time',
    }),
    frequency: Flags.string({
      char: 'f',
      default: 'monthly',
      description: '[subscription] Payment frequency',
      options: ['daily', 'weekly', 'monthly', 'yearly'],
    }),
    gateway: Flags.string({char: 'g', description: 'Payment gateway public key', required: true}),
    'max-amount': Flags.string({
      description: '[up-to] Ceiling on settlement amount in smallest token unit. Required for up-to',
    }),
    'max-chunk': Flags.string({description: '[pay-as-you-go] Max amount per chunk'}),
    // pay-as-you-go
    'max-per-period': Flags.string({description: '[pay-as-you-go] Max amount per period'}),
    'max-renewals': Flags.string({description: '[subscription] Maximum number of renewals'}),
    memo: Flags.string({description: 'Memo to attach to the policy (max 64 chars)'}),
    'period-seconds': Flags.string({description: '[pay-as-you-go] Period length in seconds'}),
    recipient: Flags.string({char: 'r', description: 'Payment recipient public key', required: true}),
    'release-condition': Flags.string({
      default: '1',
      description: '[milestone] Release bitmap: bit0=due-date, bit1=gateway, bit2=owner, bit3=recipient',
    }),
    timestamps: Flags.string({description: '[milestone] Comma-separated milestone due timestamps (unix seconds)'}),
    'token-mint': Flags.string({char: 'm', description: 'SPL token mint address', required: true}),
    'valid-after': Flags.string({
      description: '[up-to] Earliest settlement timestamp (unix seconds); omitted/<=0 means immediate',
    }),
    variant: Flags.string({
      char: 'v',
      default: 'subscription',
      description: 'Policy type variant',
      options: ['subscription', 'milestone', 'pay-as-you-go', 'one-time', 'up-to'],
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PaymentPolicyCreate)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')
    const recipient = parsePublicKey(flags.recipient)
    if (!recipient) this.error('Invalid recipient public key')
    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) this.error('Invalid gateway public key')
    const memo = encodeMemo(flags.memo ?? '', 64)
    const variant = flags.variant as Variant

    const sdk = await this.getSDK()
    let instructions
    let summary: Record<string, unknown>

    switch (variant) {
      case 'milestone': {
        if (!flags.amounts || !flags.timestamps)
          this.error('--amounts and --timestamps are required for milestone variant')
        const amounts = flags.amounts.split(',').map((s) => new BN(s.trim()))
        const ts = flags.timestamps.split(',').map((s) => new BN(s.trim()))
        const release = Number.parseInt(flags['release-condition'], 10)
        instructions = await sdk.createMilestone(tokenMint, recipient, gateway, amounts, ts, release, memo)
        summary = {
          amounts: flags.amounts,
          milestones: amounts.length,
          releaseCondition: release,
          timestamps: flags.timestamps,
        }
        break
      }

      case 'one-time': {
        if (!flags.amount) this.error('--amount is required for one-time variant')
        const amount = new BN(flags.amount)
        const dueDate = flags['due-date'] ? new BN(flags['due-date']) : null
        const expiryDate = flags.expiry ? new BN(flags.expiry) : null
        instructions = await sdk.createOneTimePayment(tokenMint, recipient, gateway, amount, memo, dueDate, expiryDate)
        summary = {
          amount: flags.amount,
          dueDate: flags['due-date'] ?? 'immediate',
          expiry: flags.expiry ?? 'never',
        }
        break
      }

      case 'subscription': {
        if (!flags.amount) this.error('--amount is required for subscription variant')
        const amount = new BN(flags.amount)
        const freq = flags.frequency === 'yearly' ? 'annually' : flags.frequency
        const paymentFrequency = {[freq]: {}} as unknown as PaymentFrequency
        const maxRenewals = flags['max-renewals'] ? Number.parseInt(flags['max-renewals'], 10) : null
        instructions = await sdk.createSubscription(
          tokenMint,
          recipient,
          gateway,
          amount,
          flags['auto-renew'],
          maxRenewals,
          paymentFrequency,
          memo,
        )
        summary = {
          amount: flags.amount,
          autoRenew: flags['auto-renew'],
          frequency: flags.frequency,
          maxRenewals: maxRenewals ?? 'unlimited',
        }
        break
      }

      case 'up-to': {
        if (!flags['max-amount'] || !flags.deadline)
          this.error('--max-amount and --deadline are required for up-to variant')
        const maxAmount = new BN(flags['max-amount'])
        const deadline = new BN(flags.deadline)
        const validAfter = flags['valid-after'] ? new BN(flags['valid-after']) : null
        instructions = await sdk.createUpToAuthorization(
          tokenMint,
          recipient,
          gateway,
          maxAmount,
          deadline,
          memo,
          validAfter,
        )
        summary = {
          deadline: flags.deadline,
          maxAmount: flags['max-amount'],
          validAfter: flags['valid-after'] ?? 'immediate',
        }
        break
      }

      default: {
        if (!flags['max-per-period'] || !flags['max-chunk'] || !flags['period-seconds'])
          this.error('--max-per-period, --max-chunk, --period-seconds are required for pay-as-you-go variant')
        instructions = await sdk.createPayAsYouGo(
          tokenMint,
          recipient,
          gateway,
          new BN(flags['max-per-period']),
          new BN(flags['max-chunk']),
          new BN(flags['period-seconds']),
          memo,
          undefined, // approvalAmount — calculated automatically
          undefined, // referralCode
          flags.expiry ? new BN(flags.expiry) : null,
        )
        summary = {
          expiry: flags.expiry ?? 'never',
          maxChunkAmount: flags['max-chunk'],
          maxPerPeriod: flags['max-per-period'],
          periodSeconds: flags['period-seconds'],
        }
        break
      }
    }

    const signature = await this.sendAll(instructions)

    this.output({
      ...summary,
      command: 'payment-policy create',
      gateway: gateway.toString(),
      recipient: recipient.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
      variant,
    })
  }
}
