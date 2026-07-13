import {Flags} from '@oclif/core'
import {PublicKey} from '@solana/web3.js'
import {decodeMemo} from '@tributary-so/sdk'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class ComposablePolicyList extends BaseCommand {
  static description = 'List composable policies for a user payment account'
  static examples = [
    '<%= config.bin %> <%= command.id %> --user-payment <USER_PAYMENT_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -u <USER_PAYMENT_PUBKEY>',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key to list composable policies for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ComposablePolicyList)
    const userPayment = parsePublicKey(flags['user-payment'])
    if (!userPayment) this.error('Invalid user payment public key')

    const sdk = await this.getReadOnlySDK()
    const userPaymentAccount = await sdk.getUserPayment(userPayment)
    const policies = await sdk.getComposablePoliciesByUserPayment(userPayment)

    const truncatedPolicies = policies.map(({account, publicKey}) => {
      let policyType
      if ('subscription' in account.policyType) {
        policyType = {
          subscription: {
            ...account.policyType.subscription,
            padding: undefined,
          },
        }
      }

      if ('payAsYouGo' in account.policyType) {
        policyType = {
          payAsYouGo: {
            ...account.policyType.payAsYouGo,
            padding: undefined,
          },
        }
      }

      if ('milestone' in account.policyType) {
        policyType = {
          milestone: {
            ...account.policyType.milestone,
            padding: undefined,
          },
        }
      }

      if ('oneTime' in account.policyType) {
        policyType = {
          oneTime: {
            ...account.policyType.oneTime,
            padding: undefined,
          },
        }
      }

      if ('upTo' in account.policyType) {
        policyType = {
          upTo: {
            ...account.policyType.upTo,
            padding: undefined,
          },
        }
      }

      return {
        ...account,
        bump: undefined,
        createdAt: account.createdAt.toNumber(),
        forwardEnabled:
          account.forwardConfig.instructionConstraint.programId.toString() !== PublicKey.default.toString(),
        gateway: account.gateway.toString(),
        memo: decodeMemo(account.memo),
        outputMint: account.forwardConfig.outputMint.toString(),
        padding: undefined,
        paymentCount: account.paymentCount,
        policyId: account.policyId,
        policyType,
        postValidation: account.postValidation,
        preValidation: account.preValidation,
        publicKey,
        recipient: account.recipient.toString(),
        rentPayer: account.rentPayer.toString(),
        status: account.status,
        totalInput: account.totalInput.toNumber(),
        totalOutput: account.totalOutput.toNumber(),
        updatedAt: account.updatedAt.toNumber(),
      }
    })

    this.log(
      JSON.stringify(
        {
          command: 'composable-policy list',
          filter: {userPayment: userPayment.toString()},
          policies: truncatedPolicies,
          policiesCount: policies.length,
          success: true,
          timestamp: new Date().toISOString(),
          userPayment: userPaymentAccount
            ? {
                activePoliciesCount: userPaymentAccount.activePoliciesCount,
                createdComposableCount: userPaymentAccount.createdComposableCount,
                createdPoliciesCount: userPaymentAccount.createdPoliciesCount,
                isActive: userPaymentAccount.isActive,
                owner: userPaymentAccount.owner.toString(),
                tokenMint: userPaymentAccount.tokenMint.toString(),
              }
            : null,
        },
        null,
        2,
      ),
    )
  }
}
