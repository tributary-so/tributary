import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayCreate extends BaseCommand {
  static description = 'Create a new payment gateway'
  static examples = [
    '<%= config.bin %> <%= command.id %> --authority ALICE --fee-bps 100 --fee-recipient BOB',
    '<%= config.bin %> <%= command.id %> -a ALICE -b 100 -r BOB -n "My Gateway" -u https://example.com',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({char: 'a', description: 'Gateway authority public key', required: true}),
    'fee-bps': Flags.string({char: 'b', description: 'Gateway fee in basis points', required: true}),
    'fee-recipient': Flags.string({char: 'r', description: 'Fee recipient public key', required: true}),
    name: Flags.string({char: 'n', default: 'Unnamed Gateway', description: 'Gateway display name'}),
    url: Flags.string({char: 'u', default: '', description: 'Gateway URL'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayCreate)
    const authority = parsePublicKey(flags.authority)
    const feeRecipient = parsePublicKey(flags['fee-recipient'])
    const feeBps = Number.parseInt(flags['fee-bps'], 10)
    if (!authority) this.error('Invalid authority public key')
    if (!feeRecipient) this.error('Invalid fee recipient public key')

    const sdk = await this.getSDK()
    const signature = await this.send(
      await sdk.createPaymentGateway(authority, feeBps, 0, feeRecipient, flags.name, flags.url),
    )

    this.output({
      authority: authority.toString(),
      command: 'gateway create',
      feeBps,
      feeRecipient: feeRecipient.toString(),
      name: flags.name,
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
      url: flags.url,
    })
  }
}
