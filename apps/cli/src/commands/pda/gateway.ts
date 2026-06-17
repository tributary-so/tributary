import { Flags } from '@oclif/core'

import { ReadOnlyCommand } from '../../lib/base-command.js'
import { parsePublicKey } from '../../lib/utils.js'

export default class PdaGateway extends ReadOnlyCommand {
  static description = 'Get gateway PDA address'
  static examples = ['<%= config.bin %> <%= command.id %> --authority GATEWAY_AUTHORITY_PUBKEY']
  static flags = {
    ...ReadOnlyCommand.baseFlags,
    authority: Flags.string({
      char: 'a',
      description: 'Gateway authority public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(PdaGateway)
    const authority = parsePublicKey(flags.authority)
    if (!authority) throw new Error('Invalid authority')

    const sdk = await this.getSDK()
    const pda = sdk.getGatewayPda(authority)
    const pdaData = sdk.getPaymentGateway(pda.address)

    this.output({
      command: 'pda gateway',
      pda: {
        address: pda.address.toString(),
        authority: authority.toString(),
        bump: pda.bump,
        data: pdaData,
        type: 'gateway',
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
