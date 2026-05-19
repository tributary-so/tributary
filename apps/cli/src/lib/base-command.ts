import {Command, Flags} from '@oclif/core'
import {Tributary} from '@tributary-so/sdk'

import {createReadOnlySDK, createSDK, output} from './utils.js'

export abstract class ReadOnlyCommand extends Command {
  static baseFlags = {
    'connection-url': Flags.string({
      char: 'c',
      default: 'https://api.devnet.solana.com',
      description: 'Solana RPC connection URL (env: SOLANA_API)',
      env: 'SOLANA_API',
    }),
  }
  protected connectionUrl!: string

  protected async getSDK(): Promise<Tributary> {
    const {sdk} = createReadOnlySDK(this.connectionUrl)
    return sdk
  }

  async init(): Promise<void> {
    const {flags} = await this.parse(this.constructor as typeof ReadOnlyCommand)
    this.connectionUrl = flags['connection-url'] as string
  }

  protected output(data: unknown): void {
    output(data)
  }
}

export abstract class BaseCommand extends Command {
  static baseFlags = {
    'connection-url': Flags.string({
      char: 'c',
      default: 'https://api.devnet.solana.com',
      description: 'Solana RPC connection URL (env: SOLANA_API)',
      env: 'SOLANA_API',
    }),
    keypath: Flags.string({
      char: 'k',
      default: 'keypair.json',
      description: 'Path to keypair file (env: KEY_PATH)',
      env: 'KEY_PATH',
    }),
  }
  protected connectionUrl!: string
  protected keypath!: string

  protected async getSDK(): Promise<Tributary> {
    const {sdk} = createSDK(this.connectionUrl, this.keypath)
    return sdk
  }

  async init(): Promise<void> {
    const {flags} = await this.parse(this.constructor as typeof BaseCommand)
    this.connectionUrl = flags['connection-url'] as string
    this.keypath = flags.keypath as string
  }

  protected output(data: unknown): void {
    output(data)
  }
}

export abstract class WalletlessCommand extends Command {
  static baseFlags = {
    'connection-url': Flags.string({
      char: 'c',
      default: 'https://api.devnet.solana.com',
      description: 'Solana RPC connection URL (env: SOLANA_API)',
      env: 'SOLANA_API',
    }),
    keypath: Flags.string({
      char: 'k',
      default: 'keypair.json',
      description: 'Path to keypair file (env: KEY_PATH)',
      env: 'KEY_PATH',
    }),
  }
  protected connectionUrl!: string
  protected keypath!: string

  async init(): Promise<void> {
    const {flags} = await this.parse(this.constructor as typeof WalletlessCommand)
    this.connectionUrl = flags['connection-url'] as string
    this.keypath = flags.keypath as string
  }

  protected output(data: unknown): void {
    output(data)
  }
}
