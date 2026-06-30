import {Flags} from '@oclif/core'
import {createRevokeInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID} from '@solana/spl-token'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class DelegateRevoke extends BaseCommand {
  static description =
    'Revoke the token delegate from the source ATA (subsequent payment execute fails until re-approved)'
  static examples = ['<%= config.bin %> <%= command.id %> --mint <MINT>']
  static flags = {
    ...BaseCommand.baseFlags,
    mint: Flags.string({char: 'm', description: 'SPL token mint address', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(DelegateRevoke)
    const mint = parsePublicKey(flags.mint)
    if (!mint) this.error('Invalid mint address')

    const sdk = await this.getSDK()
    const owner = sdk.provider.publicKey
    const ownerAta = getAssociatedTokenAddressSync(mint, owner)

    const signature = await this.send(createRevokeInstruction(ownerAta, owner, [], TOKEN_PROGRAM_ID))

    this.output({
      command: 'delegate revoke',
      mint: mint.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
