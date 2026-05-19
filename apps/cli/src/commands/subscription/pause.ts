import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class SubscriptionPause extends BaseCommand {
  static description = 'Pause a payment policy'
  static examples = [
    '<%= config.bin %> <%= command.id %> -m <MINT> -p 1',
    '<%= config.bin %> <%= command.id %> --token-mint <MINT> --policy-id 3',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'policy-id': Flags.string({
      char: 'p',
      description: 'Policy ID number',
      required: true,
    }),
    'token-mint': Flags.string({
      char: 'm',
      description: 'Token mint address',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SubscriptionPause)

    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint address')

    const policyId = Number.parseInt(flags['policy-id'], 10)

    const sdk = await this.getSDK()
    const instruction = await sdk.changePaymentPolicyStatus(tokenMint, policyId, {paused: {}})
    const tx = new anchor.web3.Transaction()
    tx.add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

    this.output({
      command: 'subscription pause',
      policyId,
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
    })
  }
}
