import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class GatewayReferralSettings extends BaseCommand {
  static description = 'Update gateway referral settings (gateway-authority only; ADR-0005/ADR-0011)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --authority ALICE --referral-allocation-bps 1000 --referral-tiers-bps 5000,3000,2000',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    authority: Flags.string({char: 'a', description: 'Gateway authority public key', required: true}),
    'referral-allocation-bps': Flags.integer({
      char: 'b',
      description: 'Referral allocation share of the gateway fee (bps, max 2500)',
      required: true,
    }),
    'referral-tiers-bps': Flags.string({
      char: 't',
      description: 'Three L1/L2/L3 tier shares (comma-sep, must sum to 10000)',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayReferralSettings)
    const authority = parsePublicKey(flags.authority)
    if (!authority) this.error('Invalid authority public key')
    const tiers = flags['referral-tiers-bps'].split(',').map((s) => Number.parseInt(s.trim(), 10))
    if (tiers.length !== 3) this.error('--referral-tiers-bps must be exactly 3 comma-separated values')

    const sdk = await this.getSDK()
    // featureFlags preserved as-is: SDK reads the current byte and only updates referral fields.
    const gateway = await sdk.getPaymentGateway(sdk.getGatewayPda(authority).address)
    const signature = await this.send(
      await sdk.updateGatewayReferralSettings(
        authority,
        gateway?.featureFlags ?? 0,
        flags['referral-allocation-bps'],
        tiers as [number, number, number],
      ),
    )

    this.output({
      authority: authority.toString(),
      command: 'gateway referral-settings',
      referralAllocationBps: flags['referral-allocation-bps'],
      referralTiersBps: tiers,
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
