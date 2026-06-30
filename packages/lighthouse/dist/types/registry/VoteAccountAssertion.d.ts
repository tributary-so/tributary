import { AssertAccountDataMultiInstructionAccounts, EquatableOperator } from '../generated';
import { Context, TransactionBuilder, PublicKey } from '@metaplex-foundation/umi';
export type VoteAccountAssertion = {
    __kind: 'AuthorizedWithdrawer';
    value: PublicKey;
    operator: EquatableOperator;
};
export declare function assertVoteAccount(context: Pick<Context, 'programs'>, input: AssertAccountDataMultiInstructionAccounts & VoteAccountAssertion): TransactionBuilder;
//# sourceMappingURL=VoteAccountAssertion.d.ts.map