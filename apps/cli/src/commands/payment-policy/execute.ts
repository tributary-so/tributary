import {Flags} from '@oclif/core'
import {GATEWAY_FEATURES} from '@tributary-so/sdk'
import BN from 'bn.js'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PaymentPolicyExecute extends BaseCommand {
  static description = 'Execute a recurring payment'
  static examples = [
    '<%= config.bin %> <%= command.id %> --policy <POLICY_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -p <POLICY_PUBKEY>',
    '<%= config.bin %> <%= command.id %> --policy <POLICY_PUBKEY> --amount 50000000',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    amount: Flags.string({
      description:
        'Payment amount for pay-as-you-go policies (ignored for subscription/milestone/oneTime). Defaults to maxChunkAmount corrected for fees.',
    }),
    policy: Flags.string({
      char: 'p',
      description: 'Payment policy public key to execute',
      exclusive: ['user-payment'],
    }),
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key (alternative to policy)',
      exclusive: ['policy'],
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PaymentPolicyExecute)

    const policyPubkey = parsePublicKey(flags.policy ?? '') || parsePublicKey(flags['user-payment'] ?? '')
    if (!policyPubkey) this.error('Either --policy or --user-payment must be provided')

    const sdk = await this.getSDK()

    // ── Resolve payment amount for PayAsYouGo ──────────────────────────
    // PaymentPolicy PayAsYouGo requires a caller-supplied chunk. For other
    // variants the schedule resolves the amount (pass null).
    let paymentAmount: BN | null = null

    const policyAccount = await sdk.program.account.paymentPolicy.fetchNullable(policyPubkey)
    if (!policyAccount) this.error('Payment policy not found')

    const variant = Object.keys(policyAccount.policyType)[0]

    if (variant === 'payAsYouGo') {
      if (flags.amount) {
        paymentAmount = new BN(flags.amount)
      } else {
        // Default to maxChunkAmount, adjusted for fees so the total pull
        // (face + fee in NET mode, or face in GROSS mode) stays within cap.
        const maxChunk = (policyAccount.policyType as {payAsYouGo: {maxChunkAmount: BN}}).payAsYouGo.maxChunkAmount
        const gatewayAccount = await sdk.program.account.paymentGateway.fetchNullable(policyAccount.gateway)
        if (!gatewayAccount) this.error('Gateway not found')
        const feeBps = gatewayAccount.gatewayFeeBps
        // PaymentPolicy respects FEATURE_NET_AMOUNT (unlike composable which
        // is hardcoded NET). NET: gross = face + fee → adjust down.
        // GROSS: total_from_user = face → no adjustment needed.
        // eslint-disable-next-line no-bitwise
        const isNetMode = (gatewayAccount.featureFlags & GATEWAY_FEATURES.NET_AMOUNT) !== 0
        paymentAmount = isNetMode && feeBps > 0 ? maxChunk.muln(10_000).divn(10_000 + feeBps) : maxChunk
      }
    }

    if (flags.amount && variant !== 'payAsYouGo') {
      this.warn('--amount is only used for pay-as-you-go policies; ignored for this variant')
    }

    const signature = await this.sendAll(await sdk.executePayment(policyPubkey, paymentAmount ?? undefined))

    this.output({
      amount: paymentAmount?.toString(),
      command: 'payment-policy execute',
      policy: policyPubkey.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
      variant,
    })
  }
}
