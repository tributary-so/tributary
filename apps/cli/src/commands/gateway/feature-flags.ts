import * as anchor from '@coral-xyz/anchor'
import {Flags} from '@oclif/core'
import {GATEWAY_FEATURES} from '@tributary-so/sdk'

import {BaseCommand} from '../../lib/base-command.js'

const FLAG_NAMES = Object.keys(GATEWAY_FEATURES) as (keyof typeof GATEWAY_FEATURES)[]

function resolveFlag(input: string): null | number {
  const upper = input.toUpperCase()
  if (upper in GATEWAY_FEATURES) return GATEWAY_FEATURES[upper as keyof typeof GATEWAY_FEATURES]
  const parsed = Number.parseInt(input, 16)
  if (!Number.isNaN(parsed)) return parsed
  return null
}

export default class GatewayFeatureFlags extends BaseCommand {
  static description = 'Update gateway feature flags (gateway authority only; CUSTOM_PROTOCOL_FEE is admin-only)'
  static examples = [
    '<%= config.bin %> <%= command.id %> --enable REFERRAL',
    '<%= config.bin %> <%= command.id %> --disable REFERRAL',
    '<%= config.bin %> <%= command.id %> --set 0x03',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
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

    const sdk = await this.getSDK()
    const authorityPubkey = sdk.provider.publicKey

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

    const tx = new anchor.web3.Transaction().add(instruction)
    const signature = await sdk.provider.sendAndConfirm(tx)

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
