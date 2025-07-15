import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { RecurringPayments } from "../target/types/recurring_payments";

const IDL = require("../target/idl/recurring_payments.json");

describe("Recurring Payments", () => {
  let context;
  let provider: BankrunProvider;
  let program: Program<RecurringPayments>;

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

    // Create bankrun context
    context = await startAnchor("./", [], []);
    provider = new BankrunProvider(context);
    program = new Program<RecurringPayments>(IDL, provider);

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
