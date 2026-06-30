import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PolicyStatus extends BaseCommand {
  static description = 'Change a payment policy status (pause / resume / delete)'
  static examples = [
    '<%= config.bin %> <%= command.id %> -m <MINT> -p 1 --status paused',
    '<%= config.bin %> <%= command.id %> -m <MINT> -p 1 --status active',
    '<%= config.bin %> <%= command.id %> -m <MINT> -p 1 --status deleted',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'policy-id': Flags.string({char: 'p', description: 'Policy ID number', required: true}),
    status: Flags.string({
      char: 's',
      description: 'New status',
      options: ['paused', 'active', 'deleted'],
      required: true,
    }),
    'token-mint': Flags.string({char: 'm', description: 'Token mint address', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PolicyStatus)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')
    const policyId = Number.parseInt(flags['policy-id'], 10)

    const sdk = await this.getSDK()
    let signature: string
    if (flags.status === 'deleted') {
      signature = await this.send(await sdk.deletePaymentPolicy(tokenMint, policyId))
    } else {
      const status = flags.status === 'paused' ? {paused: {}} : {active: {}}
      signature = await this.send(await sdk.changePaymentPolicyStatus(tokenMint, policyId, status))
    }

    this.output({
      command: 'policy status',
      policyId,
      status: flags.status,
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
    })
  }
}
