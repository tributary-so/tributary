import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  Tributary,
  PaymentFrequency,
  createMemoBuffer,
} from "@tributary-so/sdk";
import * as anchor from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react";
import config from "../constants";

export type { PaymentFrequency };

export interface SubscriptionPolicy {
  id: number;
  from: PublicKey;
  to: PublicKey;
  amount: any;
  frequency: PaymentFrequency;
  status: "active" | "paused";
  nextPaymentDue: any;
  totalPaid: any;
  createdAt: any;
}

export interface CreateSubscriptionParams {
  wallet: any;
  recipientWallet: PublicKey;
  amountUSD: number;
  frequency: "weekly" | "biweekly" | "monthly";
  memo?: string;
}

interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

async function confirmTransactionWithStatus(
  connection: Connection,
  signature: TransactionSignature,
  commitment: "processed" | "confirmed" | "finalized" = "confirmed",
  timeout: number = 60000
): Promise<any> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const { value } = await connection.getSignatureStatus(signature);

    if (value === null) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    if (value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
    }

    if (
      commitment === "processed" ||
      (commitment === "confirmed" &&
        value.confirmationStatus !== "processed") ||
      (commitment === "finalized" && value.confirmationStatus === "finalized")
    ) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
}

function getTributary(wallet: WalletContextState): Tributary {
  const connection = new Connection(config.rpcUrl, "processed");
  const anchorWallet: AnchorWallet = {
    ...wallet,
    publicKey: wallet.publicKey!,
    signTransaction: wallet.signTransaction!,
    signAllTransactions: wallet.signAllTransactions!,
  };
  return new Tributary(connection, anchorWallet as unknown as anchor.Wallet);
}

function mapFrequency(
  freq: "weekly" | "biweekly" | "monthly"
): PaymentFrequency {
  switch (freq) {
    case "weekly":
      return { weekly: {} };
    case "biweekly":
      return { custom: { 0: new anchor.BN(14 * 24 * 60 * 60) } };
    case "monthly":
      return { monthly: {} };
    default:
      return { weekly: {} };
  }
}

function usdToBN(usdAmount: number): anchor.BN {
  return new anchor.BN(Math.floor(usdAmount * 1_000_000));
}

async function getUserPayment(
  wallet: WalletContextState
): Promise<{ userPayment: any; pubkey: PublicKey } | null> {
  const tributary = getTributary(wallet);
  const userPaymentsPda = tributary.getUserPaymentPda(
    wallet.publicKey!,
    new PublicKey(config.usdcMint)
  );
  const userPayment = await tributary.getUserPayment(userPaymentsPda.address);
  if (userPayment) {
    return {
      userPayment: userPayment,
      pubkey: userPaymentsPda.address,
    };
  }
  return null;
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<SubscriptionPolicy> {
  const { wallet, recipientWallet, amountUSD, frequency } = params;
  const tributary = getTributary(wallet);

  const amountInSmallestUnits = usdToBN(amountUSD);
  const paymentFrequency = mapFrequency(frequency);
  const tokenMint = new PublicKey(config.usdcMint);
  const gateway = new PublicKey(config.gateway);

  const instructions = await tributary.createSubscription(
    tokenMint,
    recipientWallet,
    gateway,
    amountInSmallestUnits,
    true,
    null,
    paymentFrequency,
    createMemoBuffer(params.memo ?? "tributary checkout", 64),
    undefined,
    undefined,
    false
  );

  const transaction = new Transaction().add(...instructions);
  const { blockhash } =
    await tributary.program.provider.connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey!;

  const signedTx = await wallet.signTransaction!(transaction);
  const txid = await tributary.program.provider.connection.sendRawTransaction(
    signedTx.serialize()
  );
  await confirmTransactionWithStatus(tributary.connection, txid, "confirmed");

  const userPayment = await getUserPayment(wallet);

  const newPolicyPda = tributary.getPaymentPolicyPda(
    userPayment!.pubkey,
    userPayment!.userPayment.createdPoliciesCount
  ).address;
  const newPolicy = await tributary.getPaymentPolicy(newPolicyPda);
  if (!newPolicy) {
    throw new Error("Failed to find created policy");
  }

  return {
    id: newPolicy.policyId,
    from: userPayment?.userPayment.owner || wallet.publicKey!,
    to: newPolicy.recipient,
    amount: newPolicy.policyType.subscription?.amount || new anchor.BN(0),
    frequency: newPolicy.policyType.subscription?.paymentFrequency || {
      weekly: {},
    },
    status: newPolicy.status.active ? "active" : "paused",
    nextPaymentDue:
      newPolicy.policyType.subscription?.nextPaymentDue || new anchor.BN(0),
    totalPaid: newPolicy.totalPaid,
    createdAt: newPolicy.createdAt,
  };
}
