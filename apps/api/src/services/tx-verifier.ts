import { Connection, PublicKey } from "@solana/web3.js";
import { getConnection, getMintDecimals, convertAmountToFloat } from "./solana";
interface OneTimePaymentClaim {
  signature: string;
  slot: number;
  blockTime: number;
  amount: string;
  tokenMint: string;
  payer: string;
  recipient: string;
  memo: string | null;
  policyAddress?: string;
  gateway?: string;
  recordId?: number;
}
import { bytesToString } from "../db/events";

const PAYMENT_RECORD_DISCRIMINATOR = Buffer.from([
  42, 100, 253, 124, 170, 186, 231, 186,
]);

const PROGRAM_LOG_PREFIX = "Program data: ";

interface DecodedPaymentRecord {
  payment_policy: PublicKey;
  gateway: PublicKey;
  amount: bigint;
  timestamp: bigint;
  memo: number[];
  record_id: number;
  payer: PublicKey;
  recipient: PublicKey;
}

function decodePaymentRecord(data: Buffer): DecodedPaymentRecord {
  let offset = 0;

  const payment_policy = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const gateway = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const amount = data.readBigUInt64LE(offset);
  offset += 8;

  const timestamp = data.readBigInt64LE(offset);
  offset += 8;

  const memo: number[] = [];
  for (let i = 0; i < 64; i++) {
    memo.push(data[offset + i]);
  }
  offset += 64;

  const record_id = data.readUInt32LE(offset);
  offset += 4;

  const payer = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const recipient = new PublicKey(data.subarray(offset, offset + 32));

  return {
    payment_policy,
    gateway,
    amount,
    timestamp,
    memo,
    record_id,
    payer,
    recipient,
  };
}

export async function verifyTransactionPayment(
  signature: string,
  expectedWallet: string
): Promise<OneTimePaymentClaim> {
  const connection = getConnection();

  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.meta || tx.meta.err) {
    throw new Error("Transaction not found");
  }

  const logMessages = tx.meta.logMessages;
  if (!logMessages) {
    throw new Error("No PaymentRecord event found in transaction logs");
  }

  for (const log of logMessages) {
    if (!log.startsWith(PROGRAM_LOG_PREFIX)) continue;

    const eventData = Buffer.from(
      log.slice(PROGRAM_LOG_PREFIX.length),
      "base64"
    );

    if (eventData.length < 8) continue;
    const discriminator = eventData.subarray(0, 8);

    if (!discriminator.equals(PAYMENT_RECORD_DISCRIMINATOR)) continue;

    const decoded = decodePaymentRecord(eventData.subarray(8));

    if (decoded.payer.toBase58() !== expectedWallet) {
      throw new Error("PaymentRecord payer does not match walletPublicKey");
    }

    const decimals = await getMintDecimals(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    const humanAmount = convertAmountToFloat(
      Number(decoded.amount),
      decimals
    ).toFixed(2);

    const memoStr = bytesToString(decoded.memo);

    return {
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime ?? Math.floor(Date.now() / 1000),
      amount: humanAmount,
      tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      payer: decoded.payer.toBase58(),
      recipient: decoded.recipient.toBase58(),
      gateway: decoded.gateway.toBase58(),
      policyAddress: decoded.payment_policy.toBase58(),
      memo: memoStr.length > 0 ? memoStr : null,
      recordId: decoded.record_id,
    };
  }

  throw new Error("No PaymentRecord event found in transaction logs");
}
