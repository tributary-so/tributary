import {Connection, Keypair, PublicKey} from '@solana/web3.js'
import {IWallet, Tributary} from '@tributary-so/sdk'
import BN from 'bn.js'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

const isAgent = Boolean(process.env.NO_DNA)

export function readKeypairFromFile(filePath: string): Keypair {
  const resolvedPath = resolve(filePath)
  const jsonContent = readFileSync(resolvedPath, 'ascii')
  const secretKeyArray = JSON.parse(jsonContent)
  return Keypair.fromSecretKey(new Uint8Array(secretKeyArray))
}

export function parsePublicKey(input: string): null | PublicKey {
  try {
    return new PublicKey(input.trim())
  } catch {
    return null
  }
}

export function formatDate(timestamp: BN | number): string {
  const ts = BN.isBN(timestamp) ? timestamp.toNumber() : timestamp
  return new Date(ts * 1000).toISOString()
}

export function output(data: unknown): void {
  if (isAgent) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(data)
  }
}

export function createSDK(
  connectionUrl: string,
  keypath: string,
): {connection: Connection; sdk: Tributary; wallet: IWallet} {
  const connection = new Connection(connectionUrl)
  const keypair = readKeypairFromFile(keypath)
  const sdk = new Tributary(connection, keypair)
  return {connection, sdk, wallet: sdk.provider.wallet as IWallet}
}

export function createReadOnlySDK(connectionUrl: string): {connection: Connection; sdk: Tributary} {
  const connection = new Connection(connectionUrl)
  const keypair = Keypair.generate()
  const sdk = new Tributary(connection, keypair)
  return {connection, sdk}
}
