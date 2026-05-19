import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'
import {sendAndConfirmTransaction, Transaction} from '@solana/web3.js'
import {GATEWAY_FEATURES} from '@tributary-so/sdk'

import {BaseCommand} from '../../lib/base-command.js'
import {readKeypairFromFile} from '../../lib/utils.js'

const FLAG_NAMES = Object.keys(GATEWAY_FEATURES) as (keyof typeof GATEWAY_FEATURES)[]

function resolveFlag(input: string): null | number {
  const upper = input.toUpperCase()
  if (upper in GATEWAY_FEATURES) return GATEWAY_FEATURES[upper as keyof typeof GATEWAY_FEATURES]
  const parsed = Number.parseInt(input, 16)
  if (!Number.isNaN(parsed)) return parsed
  return null
}

export default class GatewayFeatureFlags extends BaseCommand {
  static description = 'Update gateway feature flags (requires admin + authority signers)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --authority-keypath auth.json --enable REFERRAL',
    '<%= config.bin %> <%= command.id %> --authority-keypath auth.json --disable REFERRAL',
    '<%= config.bin %> <%= command.id %> --authority-keypath auth.json --set 0x03',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'authority-keypath': Flags.string({
      char: 'a',
      description: 'Path to gateway authority keypair file',
      required: true,
    }),
    disable: Flags.string({
      char: 'd',
      description: `Feature flag to disable (${FLAG_NAMES.join(', ')}), or hex value`,
      exclusive: ['enable', 'set'],
    }),
    enable: Flags.string({
      char: 'e',
      description: `Feature flag to enable (${FLAG_NAMES.join(', ')}), or hex value`,
      exclusive: ['disable', 'set'],
    }),
    set: Flags.string({
      char: 's',
      description: 'Raw feature flags byte (hex, e.g. 0x03) to set directly',
      exclusive: ['enable', 'disable'],
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(GatewayFeatureFlags)
    const authorityKeypair = readKeypairFromFile(flags['authority-keypath'])

    const sdk = await this.getSDK()
    const authorityPubkey = authorityKeypair.publicKey

    let instruction: anchor.web3.TransactionInstruction

    if (flags.enable) {
      const flag = resolveFlag(flags.enable)
      if (flag === null) this.error(`Unknown flag: ${flags.enable}`)
      instruction = await sdk.enableGatewayFeature(authorityPubkey, flag)
    } else if (flags.disable) {
      const flag = resolveFlag(flags.disable)
      if (flag === null) this.error(`Unknown flag: ${flags.disable}`)
      instruction = await sdk.disableGatewayFeature(authorityPubkey, flag)
    } else if (flags.set) {
      const raw = Number.parseInt(flags.set, 16)
      if (Number.isNaN(raw)) this.error(`Invalid hex value: ${flags.set}`)
      instruction = await sdk.updateGatewayFeatureFlags(authorityPubkey, raw)
    } else {
      this.error('Specify --enable, --disable, or --set')
    }

    const tx = new Transaction().add(instruction)
    const adminKeypair = readKeypairFromFile(flags.keypath)
    const signature = await sendAndConfirmTransaction(sdk.provider.connection as anchor.web3.Connection, tx, [
      adminKeypair,
      authorityKeypair,
    ])

    this.output({
      authority: authorityPubkey.toString(),
      command: 'gateway feature-flags',
      operation: flags.enable ? 'enable' : flags.disable ? 'disable' : 'set',
      success: true,
      timestamp: new Date().toISOString(),
      transaction: signature,
      value: flags.enable ?? flags.disable ?? flags.set,
    })
  }
}
