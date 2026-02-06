import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { SEEDS } from "./constants";
import type { PdaResult } from "./types";
import BN from "bn.js";

/**
 * Derives the Program Configuration PDA.
 * This is a singleton PDA that stores global protocol settings.
 * @param programId - The PublicKey of the Tributary program
 * @returns Object containing the PDA address and bump seed
 */
export function getConfigPda(programId: PublicKey): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.CONFIG)],
    programId
  );
  return { address, bump };
}

/**
 * Derives a Payment Gateway PDA for a specific gateway authority.
 * Each gateway has its own PDA to store configuration and fee settings.
 * @param gatewayAuthority - The PublicKey of the gateway authority
 * @param programId - The PublicKey of the Tributary program
 * @returns Object containing the PDA address and bump seed
 */
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

/**
 * Derives a User Payment PDA for tracking a user's payment activity.
 * Each user has one PDA per token mint to aggregate their payment policies.
 * @param user - The PublicKey of the user
 * @param tokenMint - The PublicKey of the token mint being used for payments
 * @param programId - The PublicKey of the Tributary program
 * @returns Object containing the PDA address and bump seed
 */
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

/**
 * Derives a Payment Policy PDA for a specific payment policy.
 * Each policy within a user's payment account has its own PDA.
 * @param userPayment - The PublicKey of the user's payment PDA
 * @param policyId - The unique identifier for this policy within the user's account
 * @param programId - The PublicKey of the Tributary program
 * @returns Object containing the PDA address and bump seed
 */
export function getPaymentPolicyPda(
  userPayment: PublicKey,
  policyId: number,
  programId: PublicKey
): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.PAYMENT_POLICY),
      userPayment.toBuffer(),
      new BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    programId
  );
  return { address, bump };
}

/**
 * Derives the Payments Delegate PDA.
 * This PDA acts as the delegate authority for token accounts, allowing the program
 * to pull funds for recurring payments after user approval.
 * @param programId - The PublicKey of the Tributary program
 * @returns Object containing the PDA address and bump seed
 */
export function getPaymentsDelegatePda(programId: PublicKey): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PAYMENTS)],
    programId
  );
  return { address, bump };
}

/**
 * Derives a Referral Account PDA for a specific gateway and referral code.
 * Each referral code within a gateway has its own PDA to track the referral account.
 * @param gateway - The PublicKey of the payment gateway
 * @param referralCode - The 6-byte referral code
 * @param programId - The PublicKey of the Tributary program
 * @returns Object containing the PDA address and bump seed
 */
export function getReferralPda(
  gateway: PublicKey,
  referralCode: Buffer,
  programId: PublicKey
): PdaResult {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.REFERRAL), gateway.toBuffer(), referralCode],
    programId
  );
  return { address, bump };
}
