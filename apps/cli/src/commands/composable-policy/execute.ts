import {Args, Flags} from '@oclif/core'
import {type AccountMeta, PublicKey} from '@solana/web3.js'
import BN from 'bn.js'
import {readFileSync} from 'node:fs'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ComposablePolicyExecute extends BaseCommand {
  static args = {policy: Args.string({description: 'Composable policy public key', required: true})}
  static description = 'Execute a composable policy (single relayer fire; the scheduler loop is off-chain per ADR-0014)'
  static examples = [
    '<%= config.bin %> <%= command.id %> <COMPOSABLE_POLICY_PUBKEY>',
    '<%= config.bin %> <%= command.id %> <COMPOSABLE_POLICY_PUBKEY> --forward-ix fwd-instruction.bin',
    '<%= config.bin %> <%= command.id %> <COMPOSABLE_POLICY_PUBKEY> --forward-amount 50000000',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'forward-accounts': Flags.string({
      description: 'Comma-separated forward program account pubkeys (for forward-enabled policies)',
    }),
    'forward-amount': Flags.string({
      description:
        'Forward pull amount (PayAsYouGo only; ADR-0010 #2). Rejected client-side for subscription/milestone.',
    }),
    'forward-ix': Flags.string({
      description: 'Forward program instruction data file (or - for stdin). Empty when forward is disabled.',
    }),
    'validation-accounts': Flags.string({
      description: 'Comma-separated Lighthouse target account pubkeys (for validation-enabled policies)',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ComposablePolicyExecute)
    const policy = parsePublicKey(args.policy)
    if (!policy) this.error('Invalid composable policy public key')

    const sdk = await this.getSDK()

    // Fetch policy to check variant + hooks
    const policyAccount = await sdk.program.account.composablePolicy.fetchNullable(policy)
    if (!policyAccount) this.error('Composable policy not found')

    // Client-side reject: --forward-amount only valid for PayAsYouGo
    const variant = Object.keys(policyAccount.policyType)[0]
    if (flags['forward-amount'] && variant !== 'payAsYouGo') {
      this.error('--forward-amount is only valid for pay-as-you-go policies (ADR-0010 #2)')
    }

    const instructionData = flags['forward-ix']
      ? flags['forward-ix'] === '-'
        ? readFileSync(0)
        : readFileSync(flags['forward-ix'])
      : Buffer.alloc(0)

    const forwardAmount = flags['forward-amount'] ? new BN(flags['forward-amount']) : null

    // Assemble remaining accounts: [..validationTargets, ..forwardAccounts]
    const remainingAccounts: AccountMeta[] = []
    if (flags['validation-accounts']) {
      for (const pkStr of flags['validation-accounts'].split(',')) {
        remainingAccounts.push({isSigner: false, isWritable: false, pubkey: new PublicKey(pkStr.trim())})
      }
    }

    if (flags['forward-accounts']) {
      for (const pkStr of flags['forward-accounts'].split(',')) {
        remainingAccounts.push({isSigner: false, isWritable: false, pubkey: new PublicKey(pkStr.trim())})
      }
    }

    const signature = await this.sendAll(
      await sdk.executeComposable(policy, instructionData, forwardAmount, remainingAccounts),
    )

    this.output({
      command: 'composable-policy execute',
      policy: policy.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
      variant,
    })
  }
}
