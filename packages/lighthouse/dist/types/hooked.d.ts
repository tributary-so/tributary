import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { AccountInfoAssertion, AccountInfoAssertionArgs, DataValueAssertion, MintAccountAssertion, MintAccountAssertionArgs, StakeAccountAssertion, StakeAccountAssertionArgs, TokenAccountAssertion, TokenAccountAssertionArgs, UpgradeableLoaderStateAssertion, UpgradeableLoaderStateAssertionArgs } from './generated';
export type CompactU64 = number;
export type CompactU64Args = number;
export declare const getCompactU64Serializer: () => Serializer<number>;
export type AccountInfoAssertions = Array<AccountInfoAssertion>;
export type AccountInfoAssertionsArgs = Array<AccountInfoAssertionArgs>;
export declare function getAccountInfoAssertionsSerializer(): Serializer<AccountInfoAssertionArgs[], AccountInfoAssertion[]>;
export type MintAccountAssertions = Array<MintAccountAssertion>;
export type MintAccountAssertionsArgs = Array<MintAccountAssertionArgs>;
export declare function getMintAccountAssertionsSerializer(): Serializer<MintAccountAssertionArgs[], MintAccountAssertion[]>;
export type StakeAccountAssertions = Array<StakeAccountAssertion>;
export type StakeAccountAssertionsArgs = Array<StakeAccountAssertionArgs>;
export declare function getStakeAccountAssertionsSerializer(): Serializer<StakeAccountAssertionArgs[], StakeAccountAssertion[]>;
export type TokenAccountAssertions = Array<TokenAccountAssertion>;
export type TokenAccountAssertionsArgs = Array<TokenAccountAssertionArgs>;
export declare function getTokenAccountAssertionsSerializer(): Serializer<TokenAccountAssertionArgs[], TokenAccountAssertion[]>;
export type UpgradeableLoaderStateAssertions = Array<UpgradeableLoaderStateAssertion>;
export type UpgradeableLoaderStateAssertionsArgs = Array<UpgradeableLoaderStateAssertionArgs>;
export declare function getUpgradeableLoaderStateAssertionsSerializer(): Serializer<UpgradeableLoaderStateAssertionArgs[], UpgradeableLoaderStateAssertion[]>;
export type AccountDataAssertion = {
    offset: number;
    assertion: DataValueAssertion;
};
export type AccountDataAssertionArgs = {
    offset: number;
    assertion: DataValueAssertion;
};
export declare function getAccountDataAssertionSerializer(): Serializer<AccountDataAssertionArgs, AccountDataAssertion>;
export type AccountDataAssertions = Array<AccountDataAssertion>;
export type AccountDataAssertionsArgs = Array<AccountDataAssertionArgs>;
export declare function getAccountDataAssertionsSerializer(): Serializer<AccountDataAssertionArgs[], AccountDataAssertion[]>;
export type CompactBytes = number[];
export type CompactBytesArgs = number[];
export declare function getCompactBytesSerializer(): Serializer<number[], number[]>;
//# sourceMappingURL=hooked.d.ts.map