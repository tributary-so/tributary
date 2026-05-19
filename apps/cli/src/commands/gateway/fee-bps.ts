import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayFeeBps extends BaseCommand {
  static description = 'Change the gateway fee in basis points'
static examples = ['<%= config.bin %> <%= command.id %> --authority ALICE --fee-bps 200']
static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({
      char: 'a',
      description: 'Gateway authority public key',
      required: true,
    }),
    'fee-bps': Flags.string({
      char: 'b',
      description: 'New fee in basis points',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayFeeBps)
    const authority = parsePublicKey(flags.authority)
    const feeBps = Number.parseInt(flags['fee-bps'], 10)

    if (!authority) {
      this.error('Invalid authority public key')
    }

    const sdk = await this.getSDK()
    const instruction = await sdk.changeGatewayFeeBps(authority, feeBps)
    const tx = new anchor.web3.Transaction().add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      authority: authority.toString(),
      command: 'gateway fee-bps',
      feeBps,
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
