import {Flags} from '@oclif/core'
import {decodeAssertionData, getPostValidationPda, getPreValidationPda, parseValidationPda} from '@tributary-so/sdk'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PdaValidationPda extends BaseCommand {
  static description =
    'Get validation PDA addresses (pre + post) for a composable policy, including decoded Lighthouse assertions'
  static examples = ['<%= config.bin %> <%= command.id %> --composable-policy COMPOSABLE_POLICY_PUBKEY']
  static flags = {
    ...BaseCommand.baseFlags,
    'composable-policy': Flags.string({
      char: 'c',
      description: 'Composable policy public key',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PdaValidationPda)
    const composablePolicy = parsePublicKey(flags['composable-policy'])
    if (!composablePolicy) throw new Error('Invalid composable policy public key')

    const sdk = await this.getReadOnlySDK()
    const prePda = getPreValidationPda(composablePolicy, sdk.programId)
    const postPda = getPostValidationPda(composablePolicy, sdk.programId)

    const preAcctInfo = await sdk.connection.getAccountInfo(prePda.address)
    const postAcctInfo = await sdk.connection.getAccountInfo(postPda.address)

    const preParsed = preAcctInfo ? parseValidationPda(preAcctInfo.data) : null
    const postParsed = postAcctInfo ? parseValidationPda(postAcctInfo.data) : null

    const preDecoded = preParsed ? decodeAssertionData(preParsed.data) : null
    const postDecoded = postParsed ? decodeAssertionData(postParsed.data) : null

    this.log(
      JSON.stringify(
        {
          command: 'pda validation-pda',
          composablePolicy: composablePolicy.toString(),
          pdas: {
            post: {
              address: postPda.address.toString(),
              bump: postPda.bump,
              decoded: postDecoded,
              exists: Boolean(postAcctInfo),
              parsed: postParsed
                ? {
                    dataLen: postParsed.dataLen,
                    numPinnedAccounts: postParsed.numPinnedAccounts,
                    pinnedAccounts: postParsed.pinnedAccounts.map((pk) => pk.toString()),
                    rawData: postParsed.data.toString('hex'),
                  }
                : null,
            },
            pre: {
              address: prePda.address.toString(),
              bump: prePda.bump,
              decoded: preDecoded,
              exists: Boolean(preAcctInfo),
              parsed: preParsed
                ? {
                    dataLen: preParsed.dataLen,
                    numPinnedAccounts: preParsed.numPinnedAccounts,
                    pinnedAccounts: preParsed.pinnedAccounts.map((pk) => pk.toString()),
                    rawData: preParsed.data.toString('hex'),
                  }
                : null,
            },
          },
          success: true,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )
  }
}
