import {Args, Flags} from '@oclif/core'
import {PublicKey} from '@solana/web3.js'
import {
  assembleComposableRemainingAccounts,
  type ComposablePolicy,
  type PaymentGateway,
  resolveDefaultForwardAmount,
  resolveValidationTargets,
} from '@tributary-so/sdk'
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
        'Forward pull amount (PayAsYouGo only; ADR-0010 #2). Defaults to maxChunkAmount. Rejected client-side for subscription/milestone.',
    }),
    'forward-ix': Flags.string({
      description: 'Forward program instruction data file (or - for stdin). Empty when forward is disabled.',
    }),
    'post-validation-accounts': Flags.string({
      description: 'Comma-separated post-validation target pubkeys (overrides auto-derive from ValidationPda)',
    }),
    'validation-accounts': Flags.string({
      description:
        'Comma-separated pre-validation Lighthouse target pubkeys (overrides auto-derive from ValidationPda)',
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

    const variant = Object.keys(policyAccount.policyType)[0]

    // ── Forward amount: default to maxChunkAmount for PayAsYouGo ───────
    if (flags['forward-amount'] && variant !== 'payAsYouGo') {
      this.error('--forward-amount is only valid for pay-as-you-go policies (ADR-0010 #2)')
    }

    let forwardAmount: BN | null = null
    if (flags['forward-amount']) {
      forwardAmount = new BN(flags['forward-amount'])
    } else if (variant === 'payAsYouGo') {
      const gatewayAccount = await sdk.program.account.paymentGateway.fetchNullable(policyAccount.gateway)
      if (!gatewayAccount) this.error('Gateway not found')
      forwardAmount = resolveDefaultForwardAmount(
        policyAccount as ComposablePolicy,
        gatewayAccount as PaymentGateway,
      )
    }

    const instructionData = flags['forward-ix']
      ? flags['forward-ix'] === '-'
        ? readFileSync(0)
        : readFileSync(flags['forward-ix'])
      : Buffer.alloc(0)

    // ── Validation targets: auto-derive from ValidationPda ────────────
    let preValAccounts = await resolveValidationTargets(
      sdk.connection,
      policy,
      policyAccount.preValidation,
      sdk.programId,
      'pre',
    )

    if (flags['validation-accounts']) {
      preValAccounts = flags['validation-accounts'].split(',').map((s) => new PublicKey(s.trim()))
    }

    let postValAccounts = await resolveValidationTargets(
      sdk.connection,
      policy,
      policyAccount.postValidation,
      sdk.programId,
      'post',
    )

    if (flags['post-validation-accounts']) {
      postValAccounts = flags['post-validation-accounts'].split(',').map((s) => new PublicKey(s.trim()))
    }

    // ── Forward accounts ───────────────────────────────────────────────
    const forwardAccounts: PublicKey[] = flags['forward-accounts']
      ? flags['forward-accounts'].split(',').map((s) => new PublicKey(s.trim()))
      : []

    // ── Assemble remaining_accounts (ADR-0016 order, ADR-0008 signer stamp) ─
    const remainingAccounts = assembleComposableRemainingAccounts({
      forwardAccounts: forwardAccounts.map((pubkey) => ({isWritable: true, pubkey})),
      postTargets: postValAccounts,
      preTargets: preValAccounts,
    })

    const signature = await this.sendAll(
      await sdk.executeComposable(policy, instructionData, forwardAmount, remainingAccounts),
    )

    this.output({
      command: 'composable-policy execute',
      forwardAmount: forwardAmount?.toString(),
      policy: policy.toString(),
      postValidationAccounts: postValAccounts.map((a) => a.toString()),
      preValidationAccounts: preValAccounts.map((a) => a.toString()),
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
      variant,
    })
  }
}
