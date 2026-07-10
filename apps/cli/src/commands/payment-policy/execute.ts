import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PaymentPolicyExecute extends BaseCommand {
  static description = 'Execute a recurring payment'
  static examples = [
    '<%= config.bin %> <%= command.id %> --policy <POLICY_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -p <POLICY_PUBKEY>',
    '<%= config.bin %> <%= command.id %> --user-payment <USER_PAYMENT_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -u <USER_PAYMENT_PUBKEY>',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
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
    const signature = await this.sendAll(await sdk.executePayment(policyPubkey))

    this.output({
      command: 'payment-policy execute',
      policy: policyPubkey.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
