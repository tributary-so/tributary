import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class UserDelete extends BaseCommand {
  static description = 'Delete a user payment account (closes the account, refunds rent to owner)'
  static examples = ['<%= config.bin %> <%= command.id %> --mint <MINT>', '<%= config.bin %> user delete -m <MINT>']
  static flags = {
    ...BaseCommand.baseFlags,
    mint: Flags.string({
      char: 'm',
      description: 'SPL token mint address of the user payment account to delete',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(UserDelete)
    const mint = parsePublicKey(flags.mint)
    if (!mint) this.error('Invalid mint address')

    const sdk = await this.getSDK()
    const signature = await this.send(await sdk.deleteUserPayment(mint))

    this.output({
      command: 'user delete',
      mint: mint.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
