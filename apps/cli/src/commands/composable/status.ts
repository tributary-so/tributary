import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ComposableStatus extends BaseCommand {
  static description = 'Change a composable policy status (active / paused / completed)'
  static examples = [
    '<%= config.bin %> <%= command.id %> -m <MINT> -p 1 --status paused',
    '<%= config.bin %> <%= command.id %> -m <MINT> -p 1 --status active',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'policy-id': Flags.string({char: 'p', description: 'Composable policy ID number', required: true}),
    status: Flags.string({
      char: 's',
      description: 'New status',
      options: ['active', 'paused', 'completed'],
      required: true,
    }),
    'token-mint': Flags.string({char: 'm', description: 'Token mint address', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ComposableStatus)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')
    const policyId = Number.parseInt(flags['policy-id'], 10)

    const sdk = await this.getSDK()
    const status = {[flags.status]: {}} as unknown as Parameters<typeof sdk.changeComposablePolicyStatus>[2]
    const signature = await this.send(await sdk.changeComposablePolicyStatus(tokenMint, policyId, status))

    this.output({
      command: 'composable status',
      policyId,
      status: flags.status,
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
    })
  }
}
