import { Flags } from '@oclif/core'

import { ReadOnlyCommand } from '../../lib/base-command.js'
import { parsePublicKey } from '../../lib/utils.js'

export default class PdaUserPayment extends ReadOnlyCommand {
  static description = 'Get user payment PDA address'
  static examples = ['<%= config.bin %> <%= command.id %> --user USER_PUBKEY --token-mint MINT_PUBKEY']
  static flags = {
    ...ReadOnlyCommand.baseFlags,
    'token-mint': Flags.string({
      char: 'm',
      description: 'Token mint public key',
      required: true,
    }),
    user: Flags.string({
      char: 'u',
      description: 'User (owner) public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(PdaUserPayment)
    const user = parsePublicKey(flags.user)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!user || !tokenMint) throw new Error('Invalid user or token mint')

    const sdk = await this.getSDK()
    const pda = sdk.getUserPaymentPda(user, tokenMint)
    const pdaAccount = await sdk.getUserPayment(pda.address);

    this.output({
      command: 'pda user-payment',
      pda: {
        address: pda.address.toString(),
        bump: pda.bump,
        data: pdaAccount,
        tokenMint: tokenMint.toString(),
        type: 'user-payment',
        user: user.toString(),
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
