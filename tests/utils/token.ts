import {
  createMint as splCreateMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

export async function createMint(
  connection: Connection,
  decimals: number = 6
): Promise<PublicKey> {
  const mintAuthority = Keypair.generate();
  const mint = await splCreateMint(
    connection,
    mintAuthority,
    mintAuthority.publicKey,
    null,
    decimals
  );
  return mint;
}

export async function createTokenAccount(
  connection: Connection,
  mint: PublicKey,
  owner: Keypair
): Promise<PublicKey> {
  const tokenAccount = await createAccount(
    connection,
    owner,
    mint,
    owner.publicKey
  );
  return tokenAccount;
}

export async function mintTokens(
  connection: Connection,
  mint: PublicKey,
  destination: PublicKey,
  amount: number,
  mintAuthority: Keypair
): Promise<void> {
  await mintTo(
    connection,
    mintAuthority,
    mint,
    destination,
    mintAuthority,
    amount
  );
}
