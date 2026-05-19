import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'
import {encodeMemo, PaymentFrequency} from '@tributary-so/sdk'
import BN from 'bn.js'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class SubscriptionCreate extends BaseCommand {
  static description = 'Create a subscription payment policy'
  static examples = [
    '<%= config.bin %> <%= command.id %> -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000',
    '<%= config.bin %> <%= command.id %> -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 500000 -f weekly --no-auto-renew --max-renewals 12 --memo "Netflix"',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    amount: Flags.string({
      char: 'a',
      description: 'Payment amount in smallest token unit',
      required: true,
    }),
    'auto-renew': Flags.boolean({
      allowNo: true,
      default: true,
      description: 'Auto-renew the subscription',
    }),
    frequency: Flags.string({
      char: 'f',
      default: 'monthly',
      description: 'Payment frequency',
      options: ['daily', 'weekly', 'monthly', 'yearly'],
    }),
    gateway: Flags.string({
      char: 'g',
      description: 'Payment gateway public key',
      required: true,
    }),
    'max-renewals': Flags.string({
      description: 'Maximum number of renewals',
    }),
    memo: Flags.string({
      description: 'Memo to attach to the policy (max 64 chars)',
    }),
    recipient: Flags.string({
      char: 'r',
      description: 'Payment recipient public key',
      required: true,
    }),
    'token-mint': Flags.string({
      char: 'm',
      description: 'SPL token mint address',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SubscriptionCreate)

    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')

    const recipient = parsePublicKey(flags.recipient)
    if (!recipient) this.error('Invalid recipient public key')

    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) this.error('Invalid gateway public key')

    const amount = new BN(flags.amount)
    const frequency = flags.frequency === 'yearly' ? 'annually' : flags.frequency
    const paymentFrequency = {[frequency]: {}} as unknown as PaymentFrequency
    const autoRenew = flags['auto-renew']
    const maxRenewals = flags['max-renewals'] ? Number.parseInt(flags['max-renewals'], 10) : null
    const memo = flags.memo ? encodeMemo(flags.memo, 64) : Array.from({length: 64}, () => 0)

    const sdk = await this.getSDK()
    const instructions = await sdk.createSubscription(
      tokenMint,
      recipient,
      gateway,
      amount,
      autoRenew,
      maxRenewals,
      paymentFrequency,
      memo,
    )

    const tx = new anchor.web3.Transaction()
    for (const ix of instructions) {
      tx.add(ix)
    }

    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      amount: flags.amount,
      autoRenew,
      command: 'subscription create',
      frequency: flags.frequency,
      gateway: gateway.toString(),
      maxRenewals: maxRenewals ?? 'unlimited',
      recipient: recipient.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
    })
  }
}
