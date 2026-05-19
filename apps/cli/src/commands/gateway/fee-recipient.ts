import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayFeeRecipient extends BaseCommand {
  static description = 'Change the fee recipient for a payment gateway'
static examples = ['<%= config.bin %> <%= command.id %> --authority ALICE --new-recipient BOB']
static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({
      char: 'a',
      description: 'Gateway authority public key',
      required: true,
    }),
    'new-recipient': Flags.string({
      char: 'r',
      description: 'New fee recipient public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayFeeRecipient)
    const authority = parsePublicKey(flags.authority)
    const newRecipient = parsePublicKey(flags['new-recipient'])

    if (!authority) {
      this.error('Invalid authority public key')
    }

    if (!newRecipient) {
      this.error('Invalid new recipient public key')
    }

    const sdk = await this.getSDK()
    const instruction = await sdk.changeGatewayFeeRecipient(authority, newRecipient)
    const tx = new anchor.web3.Transaction().add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      authority: authority.toString(),
      command: 'gateway fee-recipient',
      newRecipient: newRecipient.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
