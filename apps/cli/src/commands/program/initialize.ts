import * as anchor from '@coral-xyz/anchor'
import { Flags } from '@oclif/core'

import { BaseCommand } from '../../lib/base-command.js'
import { parsePublicKey } from '../../lib/utils.js'

export default class ProgramInitialize extends BaseCommand {
  static description = 'Initialize the Tributary program'
  static examples = ['<%= config.bin %> program initialize', '<%= config.bin %> program initialize --admin <PUBKEY>']
  static flags = {
    ...BaseCommand.baseFlags,
    admin: Flags.string({
      char: 'a',
      description: 'Admin public key for program initialization (defaults to wallet public key)',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(ProgramInitialize)
    const sdk = await this.getSDK()

    const adminPubkey = parsePublicKey(flags.admin ?? sdk.provider.publicKey.toString())
    if (!adminPubkey) {
      this.error('Invalid admin public key')
    }

    const instruction = await sdk.initialize(adminPubkey, adminPubkey)
    const tx = new anchor.web3.Transaction().add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      admin: adminPubkey.toString(),
      command: 'program initialize',
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
