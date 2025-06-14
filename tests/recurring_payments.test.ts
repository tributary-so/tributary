import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { RecurringPayments } from "../target/types/recurring_payments";
import { expect } from "chai";
import { createMint, createTokenAccount } from "./utils/token";

const IDL = require("../target/idl/recurring_payments.json");

describe("Recurring Payments", () => {
  const provider = new LiteSVMProvider(fromWorkspace("."));
  const program = new Program<RecurringPayments>(IDL, provider);
  
  // Common variables
  let admin: Keypair;
  let user: Keypair;
  let configPDA: PublicKey;
  let configBump: number;
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () => {
    admin = Keypair.generate();
    user = Keypair.generate();
    
    // Airdrop SOL to admin and user
    await provider.connection.requestAirdrop(admin.publicKey, 10_000_000_000);
    await provider.connection.requestAirdrop(user.publicKey, 10_000_000_000);
    
    // Create token mint and user's token account
    tokenMint = await createMint(provider);
    userTokenAccount = await createTokenAccount(provider, tokenMint, user.publicKey);
    
    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  it("Initialize program", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: admin.publicKey,
        config: configPDA,
        systemProgram: PublicKey.default,
      })
      .signers([admin])
      .rpc();

    const configAccount = await program.account.programConfig.fetch(configPDA);
    
    expect(configAccount.admin).to.eql(admin.publicKey);
    expect(configAccount.feeRecipient).to.eql(admin.publicKey);
    expect(configAccount.protocolFeeBps).to.equal(100);
    expect(configAccount.minPaymentAmount.toString()).to.equal("1000000");
    expect(configAccount.maxPaymentAmount.toString()).to.equal("1000000000000");
    expect(configAccount.maxPoliciesPerUser).to.equal(10);
    expect(configAccount.emergencyPause).to.be.false;
    expect(configAccount.bump).to.equal(configBump);
  });

  it("Create user payment account", async () => {
    // Derive user payment PDA
    const [userPaymentPDA, userPaymentBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        user.publicKey.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .createUserPayment()
      .accounts({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        tokenAccount: userTokenAccount,
        tokenMint: tokenMint,
        config: configPDA,
        systemProgram: PublicKey.default,
      })
      .signers([user])
      .rpc();

    const userPaymentAccount = await program.account.userPayment.fetch(userPaymentPDA);
    
    expect(userPaymentAccount.owner).to.eql(user.publicKey);
    expect(userPaymentAccount.tokenAccount).to.eql(userTokenAccount);
    expect(userPaymentAccount.tokenMint).to.eql(tokenMint);
    expect(userPaymentAccount.activePoliciesCount).to.equal(0);
    expect(userPaymentAccount.isActive).to.be.true;
    expect(userPaymentAccount.bump).to.equal(userPaymentBump);
  });
});
