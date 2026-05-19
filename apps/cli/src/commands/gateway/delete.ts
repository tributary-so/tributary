import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayDelete extends BaseCommand {
  static description = 'Delete a payment gateway'
static examples = ['<%= config.bin %> <%= command.id %> --authority ALICE']
static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({
      char: 'a',
      description: 'Gateway authority public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayDelete)
    const authority = parsePublicKey(flags.authority)

    if (!authority) {
      this.error('Invalid authority public key')
    }

    const sdk = await this.getSDK()
    const instruction = await sdk.deletePaymentGateway(authority)
    const tx = new anchor.web3.Transaction().add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      authority: authority.toString(),
      command: 'gateway delete',
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
