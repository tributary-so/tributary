import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { RecurringPayments } from "../target/types/recurring_payments";

describe("Recurring Payments", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .RecurringPayments as anchor.Program<RecurringPayments>;
  const wallet = provider.wallet as anchor.Wallet;
  const payer = wallet.payer;

  let connection: any;

  // Common variables
  let admin: Keypair;
  let user: Keypair;
  let configPDA: PublicKey;
  let configBump: number;
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let mintAuthority: Keypair;
  let gatewayAuthority: Keypair;
  let feeRecipient: Keypair;
  let gatewayPDA: PublicKey;
  let gatewayBump: number;

  async function fund(account: PublicKey, amount: number) {
    const transaction = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: account,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    const signature = await provider.sendAndConfirm(transaction);
    return await provider.connection.confirmTransaction(signature, "confirmed");
  }

  beforeAll(async () => {
    // Create Solana Kite connection
    connection = provider.connection;

    // Create wallets
    admin = Keypair.generate();
    await fund(admin.publicKey, 10);
    user = Keypair.generate();
    await fund(user.publicKey, 10);
    mintAuthority = Keypair.generate();
    await fund(mintAuthority.publicKey, 10);

    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Create token mint
    tokenMint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6
    );

    // Get associated token account address for the user
    userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user.publicKey);

    // Create associated token account and mint tokens to it
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      user.publicKey
    );

    // Mint tokens to the user's account
    await mintTo(
      connection,
      mintAuthority,
      tokenMint,
      userTokenAccount,
      mintAuthority,
      1000000n // 1 token with 6 decimals
    );

    // Create gateway authority and fee recipient
    gatewayAuthority = Keypair.generate();
    await fund(gatewayAuthority.publicKey, 10);
    feeRecipient = Keypair.generate();
    await fund(feeRecipient.publicKey, 1);

    // Derive gateway PDA
    [gatewayPDA, gatewayBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );
  });

  test("Initialize program", async () => {
    await program.methods
      .initialize()
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const configAccount = await program.account.programConfig.fetch(configPDA);

    expect(configAccount.admin).toEqual(admin.publicKey);
    expect(configAccount.feeRecipient).toEqual(admin.publicKey);
    expect(configAccount.protocolFeeBps).toBe(100);
    expect(configAccount.maxPoliciesPerUser).toBe(10);
    expect(configAccount.emergencyPause).toBe(false);
    expect(configAccount.bump).toBe(configBump);
  });

  test("Create user payment account", async () => {
    // Derive user payment PDA
    const [userPaymentPDA, userPaymentBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        new PublicKey(user.publicKey).toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .createUserPayment()
      .accounts({
        owner: user.publicKey,
        tokenAccount: userTokenAccount,
        tokenMint: tokenMint,
      })
      .signers([user as any])
      .rpc();

    const userPaymentAccount = await program.account.userPayment.fetch(
      userPaymentPDA
    );

    expect(userPaymentAccount.owner).toEqual(user.publicKey);
    expect(userPaymentAccount.tokenAccount).toEqual(userTokenAccount);
    expect(userPaymentAccount.tokenMint).toEqual(tokenMint);
    expect(userPaymentAccount.activePoliciesCount).toBe(0);
    expect(userPaymentAccount.isActive).toBe(true);
    expect(userPaymentAccount.bump).toBe(userPaymentBump);
  });

  test("Create payment gateway", async () => {
    const gatewayFeeBps = 250; // 2.5% fee

    const accounts = {
      authority: gatewayAuthority.publicKey,
      gateway: gatewayPDA,
      feeRecipient: feeRecipient.publicKey,
      systemProgram: SystemProgram.programId,
    };
    await program.methods
      .createPaymentGateway(gatewayFeeBps)
      .accounts(accounts)
      .signers([gatewayAuthority])
      .rpc();

    const gatewayAccount = await program.account.paymentGateway.fetch(
      gatewayPDA
    );

    expect(gatewayAccount.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount.gatewayFeeBps).toBe(gatewayFeeBps);
    expect(gatewayAccount.isActive).toBe(true);
    expect(gatewayAccount.totalProcessed.toNumber()).toBe(0);
    expect(gatewayAccount.bump).toBe(gatewayBump);
    expect(gatewayAccount.createdAt.toNumber()).toBeGreaterThan(0);
  });
});
