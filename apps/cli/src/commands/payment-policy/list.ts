import {Flags} from '@oclif/core'
import {decodeMemo} from '@tributary-so/sdk'

import {BaseCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class PaymentPolicyList extends BaseCommand {
  static description = 'List payment policies for a user payment account'
  static examples = [
    '<%= config.bin %> <%= command.id %> --user-payment <USER_PAYMENT_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -u <USER_PAYMENT_PUBKEY>',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key to list policies for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(PaymentPolicyList)
    const userPayment = parsePublicKey(flags['user-payment'])
    if (!userPayment) this.error('Invalid user payment public key')

    const sdk = await this.getReadOnlySDK()
    const userPaymentAccount = await sdk.getUserPayment(userPayment)
    const policies = await sdk.getPaymentPoliciesByUserPayment(userPayment)

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
        memo: decodeMemo(account.memo),
        padding: undefined,
        policyId: account.policyId,
        policyType,
        publicKey,
        totalPaid: account.totalPaid.toNumber(),
        updatedAt: account.updatedAt.toNumber(),
      }
    })

    this.log(
      JSON.stringify(
        {
          command: 'payment-policy list',
          filter: {userPayment: userPayment.toString()},
          policies: truncatedPolicies,
          policiesCount: policies.length,
          success: true,
          timestamp: new Date().toISOString(),
          userPayment: userPaymentAccount
            ? {
                activePoliciesCount: userPaymentAccount.activePoliciesCount,
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
