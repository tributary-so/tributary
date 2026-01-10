import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import fetch from "node-fetch";
import { readFileSync } from "fs";
import {
  createMemoBuffer,
  getPaymentFrequency,
  PaymentFrequencyString,
  Tributary,
} from "@tributary-so/sdk";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";

// Configuration from environment variables
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR_PATH = process.env.KEYPAIR_PATH;

if (!KEYPAIR_PATH) {
  throw new Error(`KEYPAIR_PATH required!`);
}

const connection = new Connection(RPC_URL, "confirmed");
const keypairData = JSON.parse(readFileSync(KEYPAIR_PATH, "utf-8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));
console.log(`Signer: ${payer.publicKey.toString()}`);

// Initialize SDK
const wallet = new anchor.Wallet(payer);
const sdk = new Tributary(connection, wallet);

async function run() {
  // 1) Request subscription quote from server
  const quote = await fetch("http://localhost:3001/premium");
  const q = (await quote.json()) as {
    accepts: Array<{
      scheme: string;
      network: string;
      resource: string;
      id: string;
      termsUrl: string;
      amount: number;
      currency: string;
      recipient: string;
      gateway: string;
      tokenMint: string;
      paymentFrequency: string;
      paymentFrequencyCustomSeconds: number | undefined;
      autoRenew: boolean;
      maxRenewals: number | null;
    }>;
  };
  if (quote.status !== 402) throw new Error("Expected 402 quote");

  const deferredScheme = q.accepts.find((a) => a.scheme === "deferred");
  if (!deferredScheme) throw new Error("Deferred scheme not offered");

  const recipient = new PublicKey(deferredScheme.recipient);
  const gateway = new PublicKey(deferredScheme.gateway);
  const tokenMint = new PublicKey(deferredScheme.tokenMint);
  const amount = new BN(deferredScheme.amount);
  const paymentFrequency = deferredScheme.paymentFrequency;
  const autoRenew = deferredScheme.autoRenew;
  const maxRenewals = deferredScheme.maxRenewals;
  const paymentFrequencyCustomSeconds =
    deferredScheme.paymentFrequencyCustomSeconds;

  console.log("Deferred subscription required:");
  console.log(`  Scheme: ${deferredScheme.scheme}`);
  console.log(`  Network: ${deferredScheme.network}`);
  console.log(`  ID: ${deferredScheme.id}`);
  console.log(`  Recipient: ${deferredScheme.recipient}`);
  console.log(`  Gateway: ${deferredScheme.gateway}`);
  console.log(`  Token Mint: ${deferredScheme.tokenMint}`);
  console.log(
    `  Amount: ${
      deferredScheme.amount / 1000000
    } USDC (${amount.toString()} smallest units)`
  );
  console.log(`  Frequency: ${paymentFrequency}`);
  console.log(`  Auto Renew: ${autoRenew}`);
  console.log(`  Max Renewals: ${maxRenewals}`);

  // 2) Get or create the payer's associated token account
  console.log("\nChecking/creating associated token account...");
  const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    payer.publicKey
  );

  console.log(`  Payer Token Account: ${payerTokenAccount.address.toBase58()}`);

  // Check if payer has enough USDC
  const balance = await connection.getTokenAccountBalance(
    payerTokenAccount.address
  );
  console.log(`  Current Balance: ${balance.value.uiAmountString} USDC`);

  if (Number(balance.value.amount) < amount.toNumber()) {
    throw new Error(
      `Insufficient USDC balance. Have: ${
        balance.value.uiAmountString
      }, Need: ${deferredScheme.amount / 100000}`
    );
  }

  // 3) Create subscription transaction using SDK
  console.log("\nCreating subscription transaction...");
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: payer.publicKey,
    blockhash,
    lastValidBlockHeight: (await connection.getLatestBlockhash())
      .lastValidBlockHeight,
  });

  // Create subscription instructions using correct SDK method
  const subscriptionIx = await sdk.getCreateSubscriptionPolicyInstruction(
    tokenMint,
    recipient,
    gateway,
    amount,
    autoRenew,
    maxRenewals,
    getPaymentFrequency(
      paymentFrequency as PaymentFrequencyString,
      paymentFrequencyCustomSeconds
    ),
    createMemoBuffer("x402 subscription") // memo
  );

  tx.add(subscriptionIx);

  // Sign the transaction (but don't send it, the server will do that)
  tx.sign(payer);

  // Serialize the signed transaction
  const serializedTx = tx.serialize().toString("base64");

  console.log("\nTransaction created and signed (not submitted yet)");
  console.log(`  Instructions: ${tx.instructions.length}`);

  // 4) Send Payment header with serialized transaction (x402 v2 standard)
  const paymentProof = {
    x402Version: 2,
    scheme: "deferred",
    network: deferredScheme.network,
    id: deferredScheme.id,
    payload: {
      serializedTransaction: serializedTx,
    },
  };

  // Base64 encode the payment proof
  const paymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString(
    "base64"
  );

  console.log(
    "\nSending deferred payment proof to server (server will submit transaction)..."
  );
  const paid = await fetch("http://localhost:3001/premium", {
    headers: {
      Payment: paymentHeader,
    },
  });

  const result = (await paid.json()) as {
    jwt?: string;
    message?: string;
    error?: string;
    subscriptionDetails?: {
      signature?: string;
      policyAddress?: string;
      subscriptionId?: string;
      explorerUrl?: string;
    };
  };

  console.log("\nServer response:");
  console.log(result);

  if (result.jwt) {
    console.log("\n✓ Deferred subscription created successfully!");
    console.log(`JWT received: ${result.jwt.substring(0, 50)}...`);

    // Test JWT verification by making another request
    console.log("\nTesting JWT access...");
    const jwtTest = await fetch("http://localhost:3001/premium", {
      headers: {
        Authorization: `Bearer ${result.jwt}`,
      },
    });

    if (jwtTest.status === 200) {
      const content = await jwtTest.json();
      console.log("✓ JWT verification successful!");
      console.log(content);
    } else {
      console.log("⚠ JWT verification failed");
      console.log(await jwtTest.text());
    }
  }

  // Verify subscription locally if server confirmed
  if (result.subscriptionDetails) {
    console.log("\nVerifying subscription locally...");

    // Get user's payment policies
    const userPolicies = await sdk.getPaymentPoliciesByUser(payer.publicKey);
    const latestPolicy = userPolicies[userPolicies.length - 1];

    if (latestPolicy) {
      const policy = await sdk.getPaymentPolicy(latestPolicy.publicKey);
      if (policy) {
        const expectedAmount = new BN(deferredScheme.amount);
        const matches =
          policy.recipient.equals(recipient) &&
          policy.gateway.equals(gateway) &&
          policy.policyType.subscription?.amount.eq(expectedAmount);

        if (matches) {
          console.log("✓ Subscription verified locally");
        } else {
          console.log("⚠ Subscription details don't match expected values");
        }
      }
    }

    if (result.subscriptionDetails.explorerUrl) {
      console.log("\n🔗 View transaction on Solana Explorer:");
      console.log(result.subscriptionDetails.explorerUrl);
    }
  }
}

run().catch(console.error);
