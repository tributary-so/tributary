import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class UserCreate extends BaseCommand {
  static description = 'Create a user payment account for a specific token mint'
  static examples = [
    '<%= config.bin %> user create --token-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    '<%= config.bin %> user create -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'token-mint': Flags.string({
      char: 'm',
      description: 'SPL token mint address for the user payment account',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(UserCreate)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')

    const sdk = await this.getSDK()
    const signature = await this.send(await sdk.createUserPayment(tokenMint))

    this.output({
      command: 'user create',
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toBase58(),
      transaction: signature,
    })
  }
}
