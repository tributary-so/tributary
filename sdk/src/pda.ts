import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { SEEDS } from "./constants.js";
import type { PdaResult } from "./types.js";

export function getConfigPda(programId: PublicKey): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.CONFIG)],
    programId
  );
  return { address, bump };
}

export function getGatewayPda(
  gatewayAuthority: PublicKey,
  programId: PublicKey
): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.GATEWAY), gatewayAuthority.toBuffer()],
    programId
  );
  return { address, bump };
}

export function getUserPaymentPda(
  user: PublicKey,
  tokenMint: PublicKey,
  programId: PublicKey
): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.USER_PAYMENT), user.toBuffer(), tokenMint.toBuffer()],
    programId
  );
  return { address, bump };
}

export function getPaymentPolicyPda(
  userPayment: PublicKey,
  policyId: number,
  programId: PublicKey
): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.PAYMENT_POLICY),
      userPayment.toBuffer(),
      new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    programId
  );
  return { address, bump };
}

export function getPaymentsDelegatePda(programId: PublicKey): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PAYMENTS)],
    programId
  );
  return { address, bump };
}
