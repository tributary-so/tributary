import {Command, Flags} from '@oclif/core'
import {Transaction, TransactionInstruction} from '@solana/web3.js'
import {Tributary} from '@tributary-so/sdk'

import {createReadOnlySDK, createSDK, output} from './utils.js'

/**
 * Single shared base for every CLI command.
 *
 * Read-only commands call `getReadOnlySDK`; commands that sign transactions
 * call `getSDK`. Both share the same connection + keypath flag surface —
 * the keypath is simply ignored by the read-only path.
 */
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

  protected async getReadOnlySDK(): Promise<Tributary> {
    return createReadOnlySDK(this.connectionUrl)
  }

  protected async getSDK(): Promise<Tributary> {
    return createSDK(this.connectionUrl, this.keypath)
  }

  async init(): Promise<void> {
    const {flags} = await this.parse(this.constructor as typeof BaseCommand)
    this.connectionUrl = flags['connection-url'] as string
    this.keypath = flags.keypath as string
  }

  protected output(data: unknown): void {
    output(data)
  }

  /** Sign + send a single instruction, return the tx signature. */
  protected async send(instruction: TransactionInstruction): Promise<string> {
    return this.sendAll([instruction])
  }

  /** Sign + send many instructions in one transaction. */
  protected async sendAll(instructions: TransactionInstruction[]): Promise<string> {
    const sdk = await this.getSDK()
    const tx = new Transaction()
    for (const ix of instructions) tx.add(ix)
    return sdk.provider.sendAndConfirm(tx)
  }
}
