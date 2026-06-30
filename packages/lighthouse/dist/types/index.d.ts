export * from './generated';
export * from './registry';
import { PublicKey } from '@solana/web3.js';
export type MemorySeeds = {
    payer: PublicKey;
    memoryId: number;
};
export declare function findMemoryPda(seeds: MemorySeeds, config?: {
    programAddress?: PublicKey | undefined;
}): [PublicKey, number];
//# sourceMappingURL=index.d.ts.map