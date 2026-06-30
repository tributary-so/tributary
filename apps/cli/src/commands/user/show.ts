import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {formatDate, parsePublicKey} from '../../lib/utils.js'

export default class UserShow extends BaseCommand {
  static description = 'Show details of a user payment account'
  static examples = [
    '<%= config.bin %> user show --user-payment 9ZNTfG4Ny3g5HmM2qSyoF8eJ7dQeK61dnY6gMqDdKBgE',
    '<%= config.bin %> user show -u 9ZNTfG4Ny3g5HmM2qSyoF8eJ7dQeK61dnY6gMqDdKBgE',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key to inspect',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(UserShow)
    const userPayment = parsePublicKey(flags['user-payment'])
    if (!userPayment) this.error('Invalid user payment account address')

    const sdk = await this.getReadOnlySDK()
    const account = await sdk.getUserPayment(userPayment)
    if (!account) this.error('User payment account not found')

    this.output({
      command: 'user show',
      success: true,
      timestamp: formatDate(Math.floor(Date.now() / 1000)),
      userPayment: {
        activePolicies: account.activePoliciesCount,
        createdAt: formatDate(account.createdAt),
        owner: account.owner.toBase58(),
        publicKey: userPayment.toBase58(),
        tokenAccount: account.tokenAccount.toBase58(),
        tokenMint: account.tokenMint.toBase58(),
        totalPolicies: account.createdPoliciesCount,
      },
    })
  }
}
