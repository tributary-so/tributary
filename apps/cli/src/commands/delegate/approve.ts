import {Flags} from '@oclif/core'
import {createApproveInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID} from '@solana/spl-token'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class DelegateApprove extends BaseCommand {
  static description = 'Approve the UserPayment PDA as token delegate on the source ATA (ADR-0001)'
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
    const {flags} = await this.parse(DelegateApprove)
    const mint = parsePublicKey(flags.mint)
    if (!mint) this.error('Invalid mint address')

    const sdk = await this.getSDK()
    const owner = sdk.provider.publicKey
    const {address: userPaymentPda} = sdk.getUserPaymentPda(owner, mint)
    const ownerAta = getAssociatedTokenAddressSync(mint, owner)
    const amount = flags.amount === 'unlimited' ? 18_446_744_073_709_551_615n : BigInt(flags.amount)

    const signature = await this.send(
      createApproveInstruction(ownerAta, userPaymentPda, owner, amount, [], TOKEN_PROGRAM_ID),
    )

    this.output({
      amount: flags.amount,
      command: 'delegate approve',
      delegate: userPaymentPda.toString(),
      mint: mint.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
    })
  }
}
