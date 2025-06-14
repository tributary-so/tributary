import { LiteSVMProvider } from "anchor-litesvm";
import {
  createMint as splCreateMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function createMint(
  provider: LiteSVMProvider,
  decimals: number = 6
): Promise<PublicKey> {
  const mintAuthority = Keypair.generate();
  const mint = await splCreateMint(
    provider.connection,
    mintAuthority,
    mintAuthority.publicKey,
    null,
    decimals
  );
  return mint;
}

export async function createTokenAccount(
  provider: LiteSVMProvider,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const tokenAccount = await createAccount(
    provider.connection,
    owner,
    mint,
    owner
  );
  return tokenAccount;
}

export async function mintTokens(
  provider: LiteSVMProvider,
  mint: PublicKey,
  destination: PublicKey,
  amount: number,
  mintAuthority: Keypair
): Promise<void> {
  await mintTo(
    provider.connection,
    mintAuthority,
    mint,
    destination,
    mintAuthority,
    amount
  );
}
