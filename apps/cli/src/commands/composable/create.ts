import {Flags} from '@oclif/core'
import {PublicKey} from '@solana/web3.js'
import {type ForwardConfig, lighthouse, LIGHTHOUSE_PROGRAM_ID, type LighthouseAssertion} from '@tributary-so/sdk'
import BN from 'bn.js'
import {readFileSync} from 'node:fs'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

interface ValidationSpec {
  assertions: Array<{field: string; operator: string; value: number | string}>
  kind:
    | 'accountData'
    | 'accountDelta'
    | 'accountInfo'
    | 'merkleTree'
    | 'mintAccount'
    | 'stakeAccount'
    | 'sysvarClock'
    | 'tokenAccount'
  target?: string
  targetB?: string
}

function buildValidation(spec: ValidationSpec): LighthouseAssertion {
  const target = spec.target ? new PublicKey(spec.target) : PublicKey.default
  let builder
  switch (spec.kind) {
    case 'accountData': {
      builder = lighthouse.accountData(target)
      break
    }

    case 'accountDelta': {
      builder = lighthouse.accountDelta(target, spec.targetB ? new PublicKey(spec.targetB) : PublicKey.default)
      break
    }

    case 'accountInfo': {
      builder = lighthouse.accountInfo(target)
      break
    }

    case 'merkleTree': {
      builder = lighthouse.merkleTree(target)
      break
    }

    case 'mintAccount': {
      builder = lighthouse.mintAccount(target)
      break
    }

    case 'stakeAccount': {
      builder = lighthouse.stakeAccount(target)
      break
    }

    case 'sysvarClock': {
      builder = lighthouse.sysvarClock()
      break
    }

    case 'tokenAccount': {
      builder = lighthouse.tokenAccount(target)
      break
    }

    default: {
      throw new Error(`Unknown validation kind: ${spec.kind}`)
    }
  }

  for (const a of spec.assertions) {
    // ponytail: reflection — assertion field name maps 1:1 to a builder method
    const v = typeof a.value === 'string' ? BigInt(a.value) : BigInt(a.value)
    callBuilder(builder, a.field, v, a.operator)
  }

  return builder.build()
}

function callBuilder(builder: unknown, method: string, value: bigint, operator: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(builder as any)[method](value, operator)
}

function disabledForward(inputMint: PublicKey, outputMint: PublicKey): ForwardConfig {
  return {
    forwardFlags: 0,
    inputMint,
    instructionConstraint: {
      dataChecks: [
        {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
        {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
        {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
        {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
      ],
      numDataChecks: 0,
      numPinnedAccounts: 0,
      pinnedAccounts: [PublicKey.default, PublicKey.default, PublicKey.default, PublicKey.default],
      programId: PublicKey.default,
    },
    outputMint,
  }
}

export default class ComposableCreate extends BaseCommand {
  static description = 'Create a composable pull-payment policy (validation + optional forward hooks; ADR-0007/0009)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --variant pay-as-you-go -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-per-period 100000000 --max-chunk 50000000 --period-seconds 2592000',
    '<%= config.bin %> <%= command.id %> -m <MINT> -r <RECIPIENT> -g <GATEWAY> --variant subscription -a 1000000 --frequency monthly --validation guard.json',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    // subscription
    amount: Flags.string({char: 'a', description: '[subscription] Amount in smallest token unit'}),
    expiry: Flags.string({description: '[pay-as-you-go] Optional overall expiry (unix seconds); execution rejected after this time'}),
    // forward
    forward: Flags.string({
      description: 'Forward program public key (enables the swap hook). Omit to disable (same-mint topup sentinel).',
    }),
    'forward-discriminator': Flags.string({
      description: 'Hex forward-instruction discriminator for offset-0 ByteRangeCheck (required when --forward is set)',
    }),
    frequency: Flags.string({
      char: 'f',
      default: 'monthly',
      description: '[subscription] Frequency',
      options: ['daily', 'weekly', 'monthly', 'yearly'],
    }),
    gateway: Flags.string({char: 'g', description: 'Gateway public key', required: true}),
    'max-chunk': Flags.string({description: '[pay-as-you-go] Max chunk amount'}),
    // pay-as-you-go
    'max-per-period': Flags.string({description: '[pay-as-you-go] Max amount per period'}),
    memo: Flags.string({description: 'Policy memo (max 32 chars)'}),
    'min-output': Flags.string({description: 'Minimum NET (post-fee) output amount'}),
    'native-output': Flags.boolean({
      default: false,
      description: 'Unwrap WSOL → SOL via closeAccount sweep (requires output-mint = WSOL)',
    }),
    'output-mint': Flags.string({description: 'Forward output mint (defaults to token-mint for same-mint topup)'}),
    'period-seconds': Flags.string({description: '[pay-as-you-go] Period length in seconds'}),
    recipient: Flags.string({
      char: 'r',
      description: 'Recipient public key (output-mint delivery target)',
      required: true,
    }),
    'token-mint': Flags.string({char: 'm', description: 'SPL input token mint', required: true}),
    // validation
    validation: Flags.string({
      description:
        'Lighthouse validation spec JSON file path (or - for stdin). Omit to disable validation (SystemProgram sentinel).',
    }),
    variant: Flags.string({
      char: 'v',
      default: 'subscription',
      description: 'PolicyType variant',
      options: ['subscription', 'milestone', 'pay-as-you-go'],
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ComposableCreate)
    const tokenMint = parsePublicKey(flags['token-mint'])
    if (!tokenMint) this.error('Invalid token mint')
    const recipient = parsePublicKey(flags.recipient)
    if (!recipient) this.error('Invalid recipient')
    const gateway = parsePublicKey(flags.gateway)
    if (!gateway) this.error('Invalid gateway')

    // Build PolicyType
    const now = Math.floor(Date.now() / 1000)
    let policyType: Record<string, unknown>
    if (flags.variant === 'subscription') {
      if (!flags.amount) this.error('--amount required for subscription variant')
      policyType = {
        subscription: {
          amount: new BN(flags.amount),
          autoRenew: true,
          maxRenewals: null,
          nextPaymentDue: new BN(now),
          padding: Array.from({length: 104}).fill(0),
        },
      }
    } else if (flags.variant === 'pay-as-you-go') {
      if (!flags['max-per-period'] || !flags['max-chunk'] || !flags['period-seconds'])
        this.error('--max-per-period, --max-chunk, --period-seconds required for pay-as-you-go')
      policyType = {
        payAsYouGo: {
          currentPeriodStart: new BN(now),
          currentPeriodTotal: new BN(0),
          expiryDate: flags.expiry ? new BN(flags.expiry) : null,
          maxAmountPerPeriod: new BN(flags['max-per-period']),
          maxChunkAmount: new BN(flags['max-chunk']),
          padding: Array.from({length: 79}).fill(0),
          periodLengthSeconds: new BN(flags['period-seconds']),
        },
      }
    } else {
      this.error('milestone variant not yet supported in CLI create; use the SDK directly')
    }

    // Build validation
    let preValidation: Record<string, unknown> = {disabled: {}}
    let pinnedAccounts: PublicKey[] = []
    let validationData = Buffer.alloc(0)
    if (flags.validation) {
      const raw = flags.validation === '-' ? readFileSync(0, 'utf8') : readFileSync(flags.validation, 'utf8')
      const spec = JSON.parse(raw) as ValidationSpec
      const guard = buildValidation(spec)
      preValidation = {programCall: {programId: LIGHTHOUSE_PROGRAM_ID.toString()}}
      pinnedAccounts = guard.accounts.map((a) => a.pubkey)
      validationData = Buffer.from(guard.data)
    }

    // Build forward config
    const outputMint = flags['output-mint'] ? parsePublicKey(flags['output-mint']) : tokenMint
    let forwardConfig: ForwardConfig
    if (flags.forward) {
      const fwdProgram = parsePublicKey(flags.forward)
      if (!fwdProgram) this.error('Invalid forward program public key')
      if (!flags['forward-discriminator'])
        this.error(
          '--forward-discriminator is required when --forward is set (pins the instruction selector at offset 0)',
        )
      const discBytes = Buffer.from(flags['forward-discriminator'].replace('0x', ''), 'hex')
      if (discBytes.length > 8) this.error('Forward discriminator must be ≤ 8 bytes')
      const expected: number[] = [
        ...Array.from(discBytes, (b) => b),
        ...Array.from({length: 8 - discBytes.length}, () => 0),
      ]
      forwardConfig = {
        forwardFlags: flags['native-output'] ? 1 : 0,
        inputMint: tokenMint,
        instructionConstraint: {
          dataChecks: [
            {expected, length: discBytes.length, offset: 0},
            {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
            {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
            {expected: [0, 0, 0, 0, 0, 0, 0, 0], length: 0, offset: 0},
          ],
          numDataChecks: 1,
          numPinnedAccounts: 1,
          pinnedAccounts: [PublicKey.unique(), PublicKey.default, PublicKey.default, PublicKey.default],
          programId: fwdProgram,
        },
        outputMint: outputMint!,
      }
    } else {
      forwardConfig = disabledForward(tokenMint, outputMint!)
    }

    const sdk = await this.getSDK()
    const instruction = await sdk.getCreateComposablePolicyInstruction(
      tokenMint,
      recipient,
      gateway,
      policyType as Parameters<typeof sdk.getCreateComposablePolicyInstruction>[3],
      flags.memo ?? '',
      forwardConfig,
      preValidation as Parameters<typeof sdk.getCreateComposablePolicyInstruction>[6],
      pinnedAccounts,
      Buffer.from(validationData),
    )
    const signature = await this.send(instruction)

    this.output({
      command: 'composable create',
      forward: Boolean(flags.forward),
      recipient: recipient.toString(),
      success: true,
      timestamp: new Date().toISOString(),
      tokenMint: tokenMint.toString(),
      transaction: signature,
      validation: Boolean(flags.validation),
      variant: flags.variant,
    })
  }
}
