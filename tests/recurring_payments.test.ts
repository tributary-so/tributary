import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { RecurringPayments } from "../target/types/recurring_payments";
import { createMint, createTokenAccount } from "./utils/token";

const IDL = require("../target/idl/recurring_payments.json");

describe("Recurring Payments", () => {
  const client = fromWorkspace("./");
  const provider = new LiteSVMProvider(client);
  const program = new Program<RecurringPayments>(IDL, provider);
  const connection = provider.connection as any;

  // Common variables
  let admin: Keypair;
  let user: Keypair;
  let configPDA: PublicKey;
  let configBump: number;
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;

  beforeAll(async () => {
    admin = Keypair.generate();
    user = Keypair.generate();

    // Create token mint and user's token account
    tokenMint = await createMint(connection);
    userTokenAccount = await createTokenAccount(connection, tokenMint, user);

    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  test("Initialize program", async () => {
    // const tx = await program.methods
    //   .initialize()
    //   .accounts({
    //     admin: admin.publicKey,
    //   })
    //   .signers([admin])
    //   .rpc();
    //
    // const configAccount = await program.account.programConfig.fetch(configPDA);
    //
    // expect(configAccount.admin).toEqual(admin.publicKey);
    // expect(configAccount.feeRecipient).toEqual(admin.publicKey);
    // expect(configAccount.protocolFeeBps).toBe(100);
    // expect(configAccount.maxPoliciesPerUser).toBe(10);
    // expect(configAccount.emergencyPause).toBe(false);
    // expect(configAccount.bump).toBe(configBump);
  });

  // test("Create user payment account", async () => {
  //   // Derive user payment PDA
  //   const [userPaymentPDA, userPaymentBump] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("user_payment"),
  //       user.publicKey.toBuffer(),
  //       tokenMint.toBuffer(),
  //     ],
  //     program.programId
  //   );
  //
  //   const tx = await program.methods
  //     .createUserPayment()
  //     .accounts({
  //       owner: user.publicKey,
  //       tokenAccount: userTokenAccount,
  //       tokenMint: tokenMint,
  //     })
  //     .signers([user])
  //     .rpc();
  //
  //   const userPaymentAccount = await program.account.userPayment.fetch(
  //     userPaymentPDA
  //   );
  //
  //   expect(userPaymentAccount.owner).toEqual(user.publicKey);
  //   expect(userPaymentAccount.tokenAccount).toEqual(userTokenAccount);
  //   expect(userPaymentAccount.tokenMint).toEqual(tokenMint);
  //   expect(userPaymentAccount.activePoliciesCount).toBe(0);
  //   expect(userPaymentAccount.isActive).toBe(true);
  //   expect(userPaymentAccount.bump).toBe(userPaymentBump);
  // });
});
