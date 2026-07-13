import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayProtocolFee extends BaseCommand {
  static description =
    'Set a custom per-gateway protocol fee share (protocol-admin only; effective only with FEATURE_CUSTOM_PROTOCOL_FEE)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --authority GATEWAY_AUTH --enable --share-bps 50',
    '<%= config.bin %> <%= command.id %> --authority GATEWAY_AUTH --disable',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({char: 'a', description: 'Gateway authority public key', required: true}),
    disable: Flags.boolean({
      char: 'd',
      description: 'Disable custom protocol fee (revert to global rate)',
      exclusive: ['enable'],
    }),
    enable: Flags.boolean({char: 'e', description: 'Enable custom protocol fee share', exclusive: ['disable']}),
    'share-bps': Flags.integer({char: 's', default: 0, description: 'Protocol share in bps (0-10000)'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayProtocolFee)
    const authority = parsePublicKey(flags.authority)
    if (!authority) this.error('Invalid authority public key')
    if (!flags.enable && !flags.disable) this.error('Specify --enable or --disable')

    const useCustom = flags.enable
    const shareBps = flags.disable ? 0 : flags['share-bps']

    const sdk = await this.getSDK()
    const signature = await this.send(await sdk.updateGatewayProtocolFee(authority, useCustom, shareBps))

    this.output({
      authority: authority.toString(),
      command: 'gateway protocol-fee',
      customProtocolShareBps: shareBps,
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
      useCustomProtocolFee: useCustom,
    })
  }
}
