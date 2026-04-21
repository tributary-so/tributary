import {
  Connection,
  PublicKey,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  Tributary,
  PaymentFrequency,
  createMemoBuffer,
  getTokenDecimals,
} from "@tributary-so/sdk";
import * as anchor from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react";
import config from "../constants";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export interface TokenResponse {
  token: string;
  expiresAt: number;
}

export async function issueSubscriptionToken(
  walletPublicKey: PublicKey,
  recipient: PublicKey,
  tokenMint?: string,
  trackingId?: string,
  timeoutMs: number = 30000
): Promise<TokenResponse> {
  const body: any = {
    walletPublicKey: walletPublicKey.toString(),
    recipient: recipient.toString(),
  };
  if (tokenMint) {
    body.tokenMint = tokenMint.toString();
  }
  if (trackingId) {
    body.trackingId = trackingId.toString();
  }

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await fetch(`${config.apiBaseUrl}/v1/tokens/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for payment confirmation");
}

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
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  memo?: string;
  tokenMint?: string;
}

async function confirmTransactionWithStatus(
  connection: Connection,
  signature: TransactionSignature,
  commitment: "processed" | "confirmed" | "finalized" = "confirmed",
  timeout: number = 30000
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
  const connection = new Connection(config.rpcUrl, "confirmed");
  return new Tributary(connection, wallet as unknown as anchor.Wallet);
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

async function amountToBN(
  usdAmount: number,
  tokenMint: string
): Promise<anchor.BN> {
  const connection = new Connection(config.rpcUrl);
  const decimals = await getTokenDecimals(connection, tokenMint);
  if (decimals === null) {
    throw new Error("Failed to fetch token decimals");
  }
  return new anchor.BN(Math.floor(usdAmount * Math.pow(10, decimals)));
}

async function getUserPayment(
  wallet: WalletContextState,
  tokenMint: PublicKey
): Promise<{ userPayment: any; pubkey: PublicKey } | null> {
  const tributary = getTributary(wallet);
  const userPaymentsPda = tributary.getUserPaymentPda(
    wallet.publicKey!,
    tokenMint
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
  const {
    wallet,
    recipientWallet,
    amount,
    frequency,
    tokenMint: tokenMintStr,
  } = params;
  const tributary = getTributary(wallet);

  const tokenMint = new PublicKey(tokenMintStr || config.usdcMint);
  const amountInSmallestUnits = await amountToBN(amount, tokenMint.toString());
  const paymentFrequency = mapFrequency(frequency);
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
    true
  );

  const { blockhash } = await tributary.connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: instructions,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);

  let txid: TransactionSignature;
  let signedTx;

  try {
    signedTx = await wallet.signTransaction(transaction);
    txid = await tributary.connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
    });
  } catch (sendError: any) {
    const errorMsg = sendError?.message || sendError?.toString() || "";
    if (errorMsg.includes("This transaction has already been processed")) {
      console.warn(
        "Transaction may have already been sent, attempting to confirm via status"
      );

      txid = bs58.encode(signedTx.signatures[0]);
    } else {
      throw sendError;
    }
  }

  await confirmTransactionWithStatus(tributary.connection, txid!, "confirmed");

  const userPayment = await getUserPayment(wallet, tokenMint);

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

export interface CreateOneTimePaymentParams {
  wallet: WalletContextState;
  recipientWallet: PublicKey;
  amount: number;
  memo?: string;
  trackingId?: string;
  tokenMint?: string;
}

export async function issueOneTimeToken(
  walletPublicKey: PublicKey,
  transactionSignature: string,
  tokenMint?: string,
  timeoutMs: number = 30000
): Promise<TokenResponse> {
  const body = JSON.stringify({
    walletPublicKey: walletPublicKey.toString(),
    transactionSignature,
    tokenMint: tokenMint || config.usdcMint,
  });

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await fetch(`${config.apiBaseUrl}/v1/tokens/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      return response.json();
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error("Timed out waiting for payment confirmation");
}

export async function createOneTimePayment(
  params: CreateOneTimePaymentParams
): Promise<TransactionSignature> {
  const { wallet, recipientWallet, amount, tokenMint: tokenMintStr } = params;
  const tributary = getTributary(wallet);

  const tokenMint = new PublicKey(tokenMintStr || config.usdcMint);
  const amountInSmallestUnits = await amountToBN(amount, tokenMint.toString());

  const fromAta = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey!);
  const toAta = getAssociatedTokenAddressSync(tokenMint, recipientWallet);

  const memo = params.memo || params.trackingId || "tributary payment";

  const transferIx = await tributary.transfer(
    fromAta,
    toAta,
    amountInSmallestUnits,
    createMemoBuffer(memo, 64)
  );

  const { blockhash } = await tributary.connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey!,
    recentBlockhash: blockhash,
    instructions: [transferIx],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);

  let txid: TransactionSignature;
  let signedTx;

  try {
    signedTx = await wallet.signTransaction!(transaction);
    txid = await tributary.program.provider.connection.sendRawTransaction(
      signedTx.serialize()
    );
  } catch (sendError: any) {
    const errorMsg = sendError?.message || sendError?.toString() || "";
    if (errorMsg.includes("This transaction has already been processed")) {
      console.warn(
        "Transaction may have already been sent, attempting to confirm via status"
      );
      txid = bs58.encode(signedTx!.signatures[0]);
    } else {
      throw sendError;
    }
  }

  await confirmTransactionWithStatus(tributary.connection, txid!, "confirmed");

  return txid;
}
