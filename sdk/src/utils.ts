import * as anchor from "@coral-xyz/anchor";
const BN = anchor.BN;
import { PaymentFrequency, PaymentFrequencyString } from "./types";

export function encodeMemo(memo: string, size: number = 64): number[] {
  const buffer = new Uint8Array(size).fill(0);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(memo);
  buffer.set(encoded.slice(0, size));
  return Array.from(buffer);
}

export function createMemoBuffer(memo: string, size: number = 64): number[] {
  return encodeMemo(memo, size);
}

export function decodeMemo(buffer: number[]): string {
  const uint8Array = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array).replace(/\0+$/, "");
}

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
