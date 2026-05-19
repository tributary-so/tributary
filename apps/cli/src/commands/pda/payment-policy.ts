import {Flags} from '@oclif/core'

import {ReadOnlyCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PdaPaymentPolicy extends ReadOnlyCommand {
  static description = 'Get payment policy PDA address'
static examples = ['<%= config.bin %> <%= command.id %> --user-payment USER_PAYMENT_PUBKEY --policy-id 1']
static flags = {
    ...ReadOnlyCommand.baseFlags,
    'policy-id': Flags.string({
      char: 'p',
      description: 'Policy ID number',
      required: true,
    }),
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PdaPaymentPolicy)
    const userPayment = parsePublicKey(flags['user-payment'])
    const policyId = Number.parseInt(flags['policy-id'], 10)
    if (!userPayment) throw new Error('Invalid user payment')

    const sdk = await this.getSDK()
    const pda = sdk.getPaymentPolicyPda(userPayment, policyId)

    this.output({
      command: 'pda payment-policy',
      pda: {
        address: pda.address.toString(),
        bump: pda.bump,
        policyId,
        type: 'payment-policy',
        userPayment: userPayment.toString(),
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
