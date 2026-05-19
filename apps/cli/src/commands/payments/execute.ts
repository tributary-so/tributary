import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PaymentsExecute extends BaseCommand {
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
    }),
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key (alternative to policy)',
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PaymentsExecute)

    const policyPubkey = parsePublicKey(flags.policy ?? '') || parsePublicKey(flags['user-payment'] ?? '')

    if (!policyPubkey) {
      this.error('Either --policy or --user-payment must be provided')
    }

    const sdk = await this.getSDK()
    const instructions = await sdk.executePayment(policyPubkey)
    const tx = new anchor.web3.Transaction()
    for (const ix of instructions) {
      tx.add(ix)
    }

    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      command: 'payments execute',
      policy: policyPubkey.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
