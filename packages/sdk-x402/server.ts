// x402-compliant server with Tributary subscriptions
import express from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";
import { createX402Middleware, X402Options } from "./src/middleware.js";
import { TokenMeter, ComputeMeter } from "./src/metering.js";

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                      🚀 x402 v2 Demo Server 🚀                      ║
║            HTTP 402 Payment Required with Tributary Subscriptions    ║
╚══════════════════════════════════════════════════════════════════════╝
`);

console.log("⚙️  Initializing x402 middleware...");

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const GATEWAY_AUTHORITY =
  process.env.GATEWAY_AUTHORITY ||
  "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7";
const TOKEN_MINT =
  process.env.TOKEN_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const RECIPIENT_WALLET =
  process.env.RECIPIENT_WALLET ||
  "8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1";

const SUBSCRIPTION_AMOUNT = parseInt(process.env.SUBSCRIPTION_AMOUNT || "100");
const PAYMENT_FREQUENCY = process.env.PAYMENT_FREQUENCY || "monthly";
const AUTO_RENEW = process.env.AUTO_RENEW === "true";
const MAX_RENEWALS = process.env.MAX_RENEWALS
  ? parseInt(process.env.MAX_RENEWALS)
  : null;

const JWT_SECRET = process.env.JWT_SECRET || "tributary-x402-secret";

console.log("🔗 RPC URL:", RPC_URL);
console.log("💰 Token Mint:", TOKEN_MINT);
console.log("📊 Subscription Amount:", SUBSCRIPTION_AMOUNT / 1000000, "USDC");

const connection = new Connection(RPC_URL, "confirmed");

const sdk = new Tributary(connection, {} as any);

const gatewayPda = sdk.getGatewayPda(new PublicKey(GATEWAY_AUTHORITY)).address;
console.log("🔗 Gateway PDA:", gatewayPda.toBase58());

const x402Config: X402Options = {
  scheme: "deferred",
  network: "solana-devnet",
  amount: SUBSCRIPTION_AMOUNT,
  recipient: RECIPIENT_WALLET,
  gateway: gatewayPda.toBase58(),
  tokenMint: TOKEN_MINT,
  paymentFrequency: PAYMENT_FREQUENCY,
  autoRenew: AUTO_RENEW,
  maxRenewals: MAX_RENEWALS,
  jwtSecret: JWT_SECRET,
  sdk,
  connection,
};

const x402Middleware = createX402Middleware(x402Config);
console.log("✓ x402 middleware initialized successfully");

const app = express();
app.use(express.json());

console.log("\n📊 Metering Demo Examples:");
console.log("─".repeat(60));

const sampleTexts = [
  "Hello, this is a sample text for token estimation.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is a longer text that will generate more tokens when processed by an LLM.",
  `{
  "model": "gpt-4",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Explain quantum computing in simple terms."}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}`,
];

sampleTexts.forEach((text, i) => {
  const estimatedTokens = TokenMeter.estimateFromText(text);
  console.log(`  [${i + 1}] Text: "${text.substring(0, 40)}..."`);
  console.log(`      📊 Estimated tokens: ${estimatedTokens.toLocaleString()}`);
});

console.log("─".repeat(60));

console.log("\n💻 Compute Meter Examples (LLM models):");
console.log("─".repeat(60));

const modelExamples = [
  { model: "gpt-4", input: 1000, output: 500 },
  { model: "gpt-3.5-turbo", input: 2000, output: 1000 },
  { model: "claude-3-opus", input: 500, output: 2000 },
];

modelExamples.forEach((ex) => {
  const computeUnits = ComputeMeter.calculateForLLM(
    ex.model,
    ex.input,
    ex.output
  );
  console.log(`  ${ex.model}:`);
  console.log(`    Input tokens: ${ex.input.toLocaleString()}`);
  console.log(`    Output tokens: ${ex.output.toLocaleString()}`);
  console.log(`    📊 Compute units: ${computeUnits.toLocaleString()}`);
});

console.log("─".repeat(60));

app.get("/metering", (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  console.log("\n📊 /metering endpoint called");
  console.log("  🔗 URL:", req.originalUrl);

  const requestText =
    req.query.text?.toString() ||
    "This is a sample request for token estimation.";
  const model = (req.query.model?.toString() || "gpt-4") as string;

  const estimatedTokens = TokenMeter.estimateFromText(requestText);
  const jsonTokens = TokenMeter.estimateFromJSON({
    message: requestText,
    estimatedTokens,
    timestamp: Date.now(),
  });

  const inputTokens = estimatedTokens;
  const outputTokens = Math.ceil(estimatedTokens * 0.75);
  const computeUnits = ComputeMeter.calculateForLLM(
    model,
    inputTokens,
    outputTokens
  );
  const embeddingCompute = ComputeMeter.calculateForEmbedding(
    "text-embedding-3-small",
    1536,
    inputTokens
  );

  const executionTime = Date.now() - startTime;

  console.log("  💰 Input tokens:", inputTokens.toLocaleString());
  console.log("  💰 Output tokens:", outputTokens.toLocaleString());
  console.log("  📊 Compute units:", computeUnits.toLocaleString());
  console.log(`  ✓ Response generated in ${executionTime}ms`);

  res.json({
    description: "x402 v2 Metering API Demo",
    request: {
      text: requestText,
      textLength: requestText.length,
      estimatedTokens,
      jsonSize: jsonTokens,
    },
    model: {
      name: model,
      inputTokens,
      outputTokens,
      computeUnits,
      embeddingComputeUnits: embeddingCompute,
    },
    pricing: {
      estimatedCost: {
        tokens: (estimatedTokens * 0.00001).toFixed(6),
        compute: (computeUnits * 0.00003).toFixed(6),
        total: (estimatedTokens * 0.00001 + computeUnits * 0.00003).toFixed(6),
      },
      currency: "USDC",
      note: "Example pricing - actual rates depend on payment policy",
    },
    metering: {
      resources: [
        { type: "tokens.in", amount: inputTokens },
        { type: "tokens.out", amount: outputTokens },
        { type: "tokens.total", amount: inputTokens + outputTokens },
        { type: "compute.units", amount: computeUnits },
        { type: "time.ms", amount: executionTime },
        { type: "requests", amount: 1 },
      ],
    },
    endpoints: {
      "/": "This info endpoint",
      "/premium": "Premium content (requires subscription)",
      "/metering": "Metering demo and usage estimation",
    },
    x402Info: {
      version: 2,
      features: [
        "Deferred payments via Solana",
        "Token metering for pay-as-you-go",
        "Compute unit tracking",
        "JWT-based subscription verification",
      ],
    },
  });
});

console.log("✓ /metering endpoint registered");

app.get("/", (_req: express.Request, res: express.Response) => {
  console.log("\n🔗 Root endpoint called");
  res.json({
    name: "x402 v2 Demo Server",
    version: "2.0.0",
    description: "HTTP 402 Payment Required with Tributary Subscriptions",
    endpoints: {
      "/": "This info endpoint",
      "/premium": "Premium content (requires subscription via x402)",
      "/metering": "Metering demo showcasing TokenMeter and ComputeMeter APIs",
    },
    x402: {
      version: 2,
      scheme: "deferred",
      network: "solana-devnet",
      amount: SUBSCRIPTION_AMOUNT,
      currency: "USDC",
      paymentFrequency: PAYMENT_FREQUENCY,
    },
    links: {
      docs: "https://docs.tributary.so",
      github: "https://github.com/tributary-so/tributary",
    },
  });
});

console.log("✓ / endpoint registered");

app.get(
  "/premium",
  x402Middleware,
  (_req: express.Request, res: express.Response) => {
    console.log("\n💰 /premium endpoint - Payment verified!");
    console.log("  ✓ JWT valid, subscription active");
    console.log("  ✓ Accessing premium content");

    res.json({
      tier: "premium",
      data: "Premium content - Subscription verified!",
      note: "This content is only accessible with a valid x402 subscription",
      features: [
        "Priority processing",
        "Extended rate limits",
        "Premium support access",
      ],
    });
  }
);

console.log("✓ /premium endpoint registered");
console.log(
  "\n💰 Payment required: /premium (",
  SUBSCRIPTION_AMOUNT / 1000000,
  "USDC,",
  PAYMENT_FREQUENCY,
  ")"
);

const PORT = parseInt(process.env.PORT || "3001");
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🚀 Server Started Successfully!                   ║
╚══════════════════════════════════════════════════════════════════════╝
🔗 Local:    http://localhost:${PORT}/
🔗 Premium:  http://localhost:${PORT}/premium (requires subscription)
🔗 Metering: http://localhost:${PORT}/metering (demo)

💡 Try: curl http://localhost:${PORT}/metering
💡 Try: curl http://localhost:${PORT}/metering?text=Hello+World
💡 Try: curl http://localhost:${PORT}/metering?model=gpt-4

⚠️  For /premium, run the client: tsx client.ts
`);
});
