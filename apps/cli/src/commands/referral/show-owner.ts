import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ReferralShowOwner extends BaseCommand {
  static description = 'Show referral account by owner'
  static examples = [
    '<%= config.bin %> <%= command.id %> --gateway GATEWAY_PUBKEY --owner OWNER_PUBKEY',
    '<%= config.bin %> <%= command.id %> -g GATEWAY_PUBKEY -o OWNER_PUBKEY',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    gateway: Flags.string({char: 'g', description: 'Gateway public key', required: true}),
    owner: Flags.string({char: 'o', description: 'Owner public key to look up', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ReferralShowOwner)
    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) this.error('Invalid gateway public key')
    const owner = parsePublicKey(flags.owner)
    if (!owner) this.error('Invalid owner public key')

    const sdk = await this.getReadOnlySDK()
    const referral = await sdk.getReferralAccountByOwner(gateway, owner)
    if (!referral) this.error('Referral not found')

    this.output({
      command: 'referral show-owner',
      referral: {code: Buffer.from(referral.referralCode).toString('utf8'), owner: referral.owner.toBase58()},
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
