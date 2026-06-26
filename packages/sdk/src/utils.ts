import BN from "bn.js";
import { PaymentFrequency, PaymentFrequencyString, UserPayment } from "./types";
import { Connection, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import {
  safeFetchMetadata,
  findMetadataPda,
  type Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { getMint } from "@solana/spl-token";

/**
 * Encodes a string memo into a fixed-size number array (Uint8Array).
 * @param memo The string memo to encode.
 * @param size The desired size of the output array. Defaults to 64.
 * @returns A number array representing the encoded memo.
 */
export function encodeMemo(memo: string, size: number = 64): number[] {
  const buffer = new Uint8Array(size).fill(0);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(memo);
  buffer.set(encoded.slice(0, size));
  return Array.from(buffer);
}

/**
 * Creates a memo buffer from a string (alias for encodeMemo).
 * Encodes a string memo into a fixed-size number array for use in transaction memos.
 * @param memo - The string memo to encode
 * @param size - The desired size of the output array (default: 64)
 * @returns A number array representing the encoded memo, padded with zeros
 */
export function createMemoBuffer(memo: string, size: number = 64): number[] {
  return encodeMemo(memo, size);
}

/**
 * Decodes a memo buffer back to a string.
 * Converts a number array back to the original string, trimming any trailing null bytes.
 * @param buffer - The number array containing the encoded memo
 * @returns The decoded string with trailing null bytes removed
 */
export function decodeMemo(buffer: number[]): string {
  const uint8Array = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array).replace(/\0+$/, "");
}

/**
 * Converts a payment frequency string to the corresponding PaymentFrequency enum variant.
 * Used to create payment policies with different recurring intervals.
 * @param frequency - The string representation of the payment frequency
 * @param customIntervalSeconds - Required when frequency is "custom", specifies interval in seconds
 * @returns The PaymentFrequency enum variant for the smart contract
 * @throws Error if customIntervalSeconds is not provided for custom frequency
 */
export function getPaymentFrequency(
  frequency: PaymentFrequencyString,
  customIntervalSeconds?: number
): PaymentFrequency {
  switch (frequency) {
    case "daily":
      return { daily: {} };
    case "weekly":
      return { weekly: {} };
    case "monthly":
      return { monthly: {} };
    case "quarterly":
      return { quarterly: {} };
    case "semiAnnually":
      return { semiAnnually: {} };
    case "annually":
      return { annually: {} };
    case "custom":
      if (!customIntervalSeconds)
        throw new Error("customIntervalSeconds required for custom frequency!");
      return { custom: { 0: new BN(customIntervalSeconds) } };
    default:
      return { daily: {} };
  }
}

/**
 * Calculates the number of payments per year for a given payment frequency.
 * @param frequency - The payment frequency
 * @returns Number of payments per year
 */
export function computePaymentsPerYear(frequency: PaymentFrequency): number {
  if ("daily" in frequency) {
    return 365;
  } else if ("weekly" in frequency) {
    return 52;
  } else if ("monthly" in frequency) {
    return 12;
  } else if ("quarterly" in frequency) {
    return 4;
  } else if ("semiAnnually" in frequency) {
    return 2;
  } else if ("annually" in frequency) {
    return 1;
  } else if ("custom" in frequency) {
    // Custom frequency is in seconds, calculate payments per year
    const secondsPerYear = 365 * 24 * 60 * 60; // Approximate
    return Math.floor(secondsPerYear / frequency.custom[0].toNumber());
  }
  return 12; // Default to monthly
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateSecureRandomString(length: number = 6): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((x) => characters[x % characters.length])
    .join("");
}

/**
 * Fetches token metadata for a given mint address.
 * Uses Metaplex Token Metadata program to retrieve on-chain metadata.
 * @param connection - Solana RPC connection
 * @param mintAddress - Base58 encoded mint address string or PublicKey
 * @returns Promise<Metadata | null> - Metadata object or null if not found
 */
export async function getTokenMetadata(
  connection: Connection,
  mintAddress: string | PublicKey
): Promise<Metadata | null> {
  const mintPubkey =
    typeof mintAddress === "string" ? new PublicKey(mintAddress) : mintAddress;

  const umi = createUmi(connection);

  const metadataPda = findMetadataPda(umi, { mint: publicKey(mintPubkey) });

  const metadata = await safeFetchMetadata(umi, metadataPda);
  return metadata;
}

/**
 * Fetches token symbol for a given mint address.
 * Convenience wrapper around getTokenMetadata that extracts just the symbol.
 * @param connection - Solana RPC connection
 * @param mintAddress - Base58 encoded mint address string or PublicKey
 * @returns Promise<string | null> - Token symbol string or null if not found
 */
export async function getTokenSymbol(
  connection: Connection,
  mintAddress: string | PublicKey
): Promise<string | null> {
  const metadata = await getTokenMetadata(connection, mintAddress);
  return metadata?.symbol ?? null;
}

/**
 * Fetches token decimals (precision) for a given mint address.
 * Uses SPL Token program to retrieve mint information containing decimals.
 * @param connection - Solana RPC connection
 * @param mintAddress - Base58 encoded mint address string or PublicKey
 * @returns Promise<number | null> - Number of decimals (precision) or null if not found
 */
export async function getTokenDecimals(
  connection: Connection,
  mintAddress: string | PublicKey
): Promise<number | null> {
  const mintPubkey =
    typeof mintAddress === "string" ? new PublicKey(mintAddress) : mintAddress;

  try {
    const mint = await getMint(connection, mintPubkey);
    return mint.decimals;
  } catch {
    return null;
  }
}

/**
 * Next composable policyId for a UserPayment.
 *
 * ComposablePolicy and PaymentPolicy maintain INDEPENDENT id counters on
 * the same UserPayment PDA (see AGENTS.md §"Counter separation"). The
 * composable policyId MUST come from `createdComposableCount`, never from
 * `createdPoliciesCount` — aliasing to the regular counter collides with
 * an existing PaymentPolicy PDA (H-6).
 *
 * If `userPayment` is null (first-ever policy on this UserPayment) or the
 * composable counter is absent on a legacy account, treat as 0 so the
 * first composable receives id 1.
 */
export function nextComposablePolicyId(
  userPayment: Pick<UserPayment, "createdComposableCount"> | null
): number {
  return (userPayment?.createdComposableCount ?? 0) + 1;
}
