import {Flags} from '@oclif/core'

import {ReadOnlyCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ReferralChain extends ReadOnlyCommand {
  static description = 'Show referral chain for an owner'
static examples = [
    '<%= config.bin %> <%= command.id %> --gateway GATEWAY_PUBKEY --owner OWNER_PUBKEY',
    '<%= config.bin %> <%= command.id %> -g GATEWAY_PUBKEY -o OWNER_PUBKEY',
  ]
static flags = {
    ...ReadOnlyCommand.baseFlags,
    gateway: Flags.string({
      char: 'g',
      description: 'Gateway public key',
      required: true,
    }),
    owner: Flags.string({
      char: 'o',
      description: 'Owner public key to trace chain for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ReferralChain)

    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) {
      this.error('Invalid gateway public key')
      return
    }

    const owner = parsePublicKey(flags.owner)
    if (!owner) {
      this.error('Invalid owner public key')
      return
    }

    const sdk = await this.getSDK()
    const chain = await sdk.getReferralChain(owner, gateway)

    this.output({
      chain: {
        L1: chain[0]?.toString() ?? null,
        L2: chain[1]?.toString() ?? null,
        L3: chain[2]?.toString() ?? null,
      },
      command: 'referral chain',
      owner: owner.toBase58(),
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
