# SDKs for Developers

## **TypeScript SDK** (`sdk/`)

- Complete protocol interaction library with Anchor integration
- Payment management functions (create, execute, pause/resume policies)
- PDA (Program Derived Address) helpers for deterministic addresses
- Token delegation utilities for SPL integration
- Error handling, validation, and payment frequency mapping

```typescript
const instructions = await sdk.createSubscriptionInstruction(
  params.token,
  params.recipient,
  params.gateway,
  params.amount,
  false,
  null,
  createPaymentFrequency(params.interval),
  createMemoBuffer(params.memo || "", 64),
  params.startTime,
  params.approvalAmount,
  params.executeImmediately ?? true
);

// Build transaction
const transaction = new Transaction();
instructions.forEach((ix) => transaction.add(ix));
transaction.feePayer = wallet.publicKey;
const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
const signedTx = await wallet.signTransaction(transaction);
const txId = await connection.sendRawTransaction(signedTx.serialize());
```

## **React SDK** (`sdk-react/`)

- Pre-built payment components
- React hooks for payment management
- TypeScript support
- Wallet integration

```typescript
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
<SubscriptionButton
  amount={new BN("10000000")}
  token={new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")} // USDC mint
  recipient={recipient}
  gateway={gateway}
  interval={PaymentInterval.Weekly}
  maxRenewals={12}
  memo={`Monthly donation to ${repository}`}
  label="Donate $10/month"
  radius="sm"
  size="lg"
  executeImmediately={true}
  className="px-6 py-3 font-semibold bg-gradient-to-r from-[#9945FF] to-[#14F195] border-0 font-bold text-xl px-6 py-3 text-black"
  onSuccess={(tx) => console.log("Donation successful:", tx)}
  onError={(err) => console.error("Donation failed:", err)}
/>;
```
