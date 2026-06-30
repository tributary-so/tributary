import {Flags} from '@oclif/core'
import {PublicKey} from '@solana/web3.js'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ReferralCreate extends BaseCommand {
  static description = 'Create a referral account'
  static examples = [
    '<%= config.bin %> <%= command.id %> --gateway GATEWAY_PUBKEY',
    '<%= config.bin %> <%= command.id %> --gateway GATEWAY_PUBKEY --code MYCODE',
    '<%= config.bin %> <%= command.id %> -g GATEWAY_PUBKEY -c MYCODE -r REFERRER_PUBKEY',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    code: Flags.string({char: 'c', description: 'Referral code (auto-generated if not provided)'}),
    gateway: Flags.string({char: 'g', description: 'Gateway public key', required: true}),
    referrer: Flags.string({char: 'r', description: 'Referrer public key (for nested referrals)'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ReferralCreate)

    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) this.error('Invalid gateway public key')

    const code = flags.code ?? Math.random().toString(36).slice(2, 8).toUpperCase()

    let referrer: PublicKey | undefined
    if (flags.referrer) {
      referrer = parsePublicKey(flags.referrer) ?? undefined
      if (!referrer) this.error('Invalid referrer public key')
    }

    const sdk = await this.getSDK()
    const tx = await sdk.createReferralAccount(gateway, code, referrer)

    this.output({
      code,
      command: 'referral create',
      gateway: gateway.toBase58(),
      referrer: referrer?.toBase58() ?? null,
      success: true,
      timestamp: new Date().toISOString(),
      transaction: tx,
    })
  }
}
