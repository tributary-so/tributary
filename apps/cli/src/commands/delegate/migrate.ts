import {Flags} from '@oclif/core'
import BN from 'bn.js'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class DelegateMigrate extends BaseCommand {
  static description =
    'Migrate from the legacy global PaymentsDelegate PDA to the per-mint UserPayment PDA delegate (ADR-0001 back-compat bridge)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --mint <MINT> --amount 1000000',
    '<%= config.bin %> <%= command.id %> --mint <MINT> --amount unlimited',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    amount: Flags.string({
      char: 'a',
      description: 'Delegated amount in smallest token unit, or "unlimited" for u64::MAX',
      required: true,
    }),
    mint: Flags.string({char: 'm', description: 'SPL token mint address', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(DelegateMigrate)
    const mint = parsePublicKey(flags.mint)
    if (!mint) this.error('Invalid mint address')

    const amount = flags.amount === 'unlimited' ? new BN('18446744073709551615') : new BN(flags.amount)

    const sdk = await this.getSDK()
    const signature = await this.sendAll(await sdk.migrateDelegate(mint, amount))

    this.output({
      amount: flags.amount,
      command: 'delegate migrate',
      mint: mint.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
