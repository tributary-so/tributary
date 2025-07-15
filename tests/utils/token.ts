import { BankrunProvider } from "anchor-bankrun";
import { Keypair, PublicKey } from "@solana/web3.js";
import { 
  createMint as splCreateMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";

export async function createMint(
  provider: BankrunProvider,
  decimals: number = 6
): Promise<PublicKey> {
  const mintAuthority = Keypair.generate();
  
  // Fund the mint authority
  await provider.context.banksClient.addAccount(mintAuthority.publicKey, 1_000_000_000);
  
  const mint = await splCreateMint(
    provider.connection,
    mintAuthority,
    mintAuthority.publicKey,
    null,
    decimals,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
  
  // Register the mint with bankrun
  await provider.context.banksClient.registerToken(mint);
  
  return mint;
}

export async function createTokenAccount(
  provider: BankrunProvider,
  mint: PublicKey,
  owner: Keypair
): Promise<PublicKey> {
  // Fund the owner
  await provider.context.banksClient.addAccount(owner.publicKey, 1_000_000_000);
  
  const tokenAccount = await createAccount(
    provider.connection,
    owner,
    mint,
    owner.publicKey,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
  
  // Register the token account with bankrun
  const accountInfo = await getAccount(provider.connection, tokenAccount);
  await provider.context.banksClient.registerTokenAccount(
    tokenAccount,
    mint,
    owner.publicKey
  );
  
  return tokenAccount;
}

export async function mintTokens(
  provider: BankrunProvider,
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
    amount,
    [],
    undefined,
    TOKEN_PROGRAM_ID
  );
  
  // Update the token account in bankrun
  await provider.context.banksClient.updateTokenAccount(
    destination,
    amount
  );
}
