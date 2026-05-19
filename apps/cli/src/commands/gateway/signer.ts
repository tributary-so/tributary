import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewaySigner extends BaseCommand {
  static description = 'Change the gateway signer authorized to execute payments'
static examples = ['<%= config.bin %> <%= command.id %> --authority ALICE --new-signer BOB']
static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({
      char: 'a',
      description: 'Current gateway authority public key',
      required: true,
    }),
    'new-signer': Flags.string({
      char: 's',
      description: 'New signer public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewaySigner)
    const authority = parsePublicKey(flags.authority)
    const newSigner = parsePublicKey(flags['new-signer'])

    if (!authority) {
      this.error('Invalid authority public key')
    }

    if (!newSigner) {
      this.error('Invalid new signer public key')
    }

    const sdk = await this.getSDK()
    const instruction = await sdk.changeGatewaySigner(authority, newSigner)
    const tx = new anchor.web3.Transaction().add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      authority: authority.toString(),
      command: 'gateway signer',
      newSigner: newSigner.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
