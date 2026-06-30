import {Flags} from '@oclif/core'
import BN from 'bn.js'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PaymentTransfer extends BaseCommand {
  static description = 'Transfer tokens via the Tributary fee+referral integrated transfer instruction (ADR-0004)'
  static examples = [
    '<%= config.bin %> <%= command.id %> -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000 --memo "invoice #42"',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    amount: Flags.string({char: 'a', description: 'Amount in smallest token unit', required: true}),
    gateway: Flags.string({
      char: 'g',
      description: 'Gateway public key (routes fees + referral rewards)',
      required: true,
    }),
    memo: Flags.string({description: 'Memo string to attach'}),
    recipient: Flags.string({char: 'r', description: 'Recipient public key', required: true}),
    'referral-code': Flags.string({description: 'Optional 6-char referral code'}),
    'token-mint': Flags.string({char: 'm', description: 'SPL token mint address', required: true}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PaymentTransfer)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')
    const recipient = parsePublicKey(flags.recipient)
    if (!recipient) this.error('Invalid recipient public key')
    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) this.error('Invalid gateway public key')
    const amount = new BN(flags.amount)

    const sdk = await this.getSDK()
    const instructions = await sdk.transfer(
      tokenMint,
      recipient,
      gateway,
      amount,
      flags.memo ?? '',
      flags['referral-code'],
    )
    const signature = await this.sendAll(instructions)

    this.output({
      amount: flags.amount,
      command: 'payment transfer',
      gateway: gateway.toString(),
      recipient: recipient.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
    })
  }
}
