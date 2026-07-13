import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PaymentPolicyDelete extends BaseCommand {
  static description = 'Delete a payment policy permanently'
  static examples = ['<%= config.bin %> <%= command.id %> -m <MINT> -p 1']
  static flags = {
    ...BaseCommand.baseFlags,
    'policy-id': Flags.string({char: 'p', description: 'Policy ID number', required: true}),
    'token-mint': Flags.string({char: 'm', description: 'Token mint address', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PaymentPolicyDelete)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')
    const policyId = Number.parseInt(flags['policy-id'], 10)

    const sdk = await this.getSDK()
    const signature = await this.send(await sdk.deletePaymentPolicy(tokenMint, policyId))

    this.output({
      command: 'payment-policy delete',
      policyId,
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
    })
  }
}
