import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayShow extends BaseCommand {
  static description = 'Show detailed information about a payment gateway'
  static examples = ['<%= config.bin %> <%= command.id %> --gateway GATEWAY_PUBKEY']
  static flags = {
    ...BaseCommand.baseFlags,
    gateway: Flags.string({char: 'g', description: 'Gateway public key to inspect', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayShow)
    const gatewayPubkey = parsePublicKey(flags.gateway)
    if (!gatewayPubkey) this.error('Invalid gateway public key')

    const sdk = await this.getReadOnlySDK()
    const gateway = await sdk.getPaymentGateway(gatewayPubkey)
    if (!gateway) this.error('Gateway not found')

    this.output({
      command: 'gateway show',
      gateway: {
        active: gateway.isActive,
        authority: gateway.authority.toString(),
        featureFlags: gateway.featureFlags,
        feeBps: gateway.gatewayFeeBps,
        feeRecipient: gateway.feeRecipient.toString(),
        name: Buffer.from(gateway.name).toString('utf8').replaceAll('\0', ''),
        publicKey: gatewayPubkey.toString(),
        url: Buffer.from(gateway.url).toString('utf8').replaceAll('\0', ''),
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
