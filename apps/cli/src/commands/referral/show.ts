import {Flags} from '@oclif/core'

import {ReadOnlyCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ReferralShow extends ReadOnlyCommand {
  static description = 'Show referral account by code'
  static examples = [
    '<%= config.bin %> <%= command.id %> --gateway GATEWAY_PUBKEY --code MYCODE',
    '<%= config.bin %> <%= command.id %> -g GATEWAY_PUBKEY -c MYCODE',
  ]
  static flags = {
    ...ReadOnlyCommand.baseFlags,
    code: Flags.string({
      char: 'c',
      description: 'Referral code to look up',
      required: true,
    }),
    gateway: Flags.string({
      char: 'g',
      description: 'Gateway public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ReferralShow)

    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) {
      this.error('Invalid gateway public key')
      return
    }

    const sdk = await this.getSDK()
    const referral = await sdk.getReferralAccountByCode(gateway, flags.code)
    if (!referral) {
      this.error('Referral not found')
      return
    }

    this.output({
      command: 'referral show',
      referral: {
        code: Buffer.from(referral.referralCode).toString('utf8'),
        gateway: referral.gateway.toBase58(),
        owner: referral.owner.toBase58(),
        referrer: referral.referrer?.toBase58() ?? null,
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
