import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Tributary } from "../packages/sdk/src/sdk";
import { getConfigPda, getUserPaymentPda } from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { Tributary as TributaryIdl } from "../target/types/tributary";

describe("Surfpool - Mainnet Integration", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<TributaryIdl>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let surfpool: SurfpoolHelper;
  let sdk: Tributary;

  let admin: Keypair;
  let user: Keypair;
  let feeRecipient: Keypair;
  let configPDA: PublicKey;
  let userPaymentPDA: PublicKey;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    const isSurfpool = await surfpool.isSurfpool();
    if (!isSurfpool) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    sdk = new Tributary(connection, wallet.payer);

    admin = Keypair.generate();
    user = Keypair.generate();
    feeRecipient = Keypair.generate();

    configPDA = getConfigPda(program.programId).address;
  });

  describe("USDC on mainnet-forked Surfnet", () => {
    test("fund keypairs via surfpool cheatcodes", async () => {
      await surfpool.setAccount({
        publicKey: admin.publicKey,
        lamports: 10_000_000_000,
      });
      await surfpool.setAccount({
        publicKey: user.publicKey,
        lamports: 10_000_000_000,
      });
      await surfpool.setAccount({
        publicKey: feeRecipient.publicKey,
        lamports: 1_000_000_000,
      });

      const adminBalance = await connection.getBalance(admin.publicKey);
      const userBalance = await connection.getBalance(user.publicKey);
      expect(adminBalance).toBe(10_000_000_000);
      expect(userBalance).toBe(10_000_000_000);
    });

    test("give user 1000 USDC via surfpool cheatcode", async () => {
      const usdcAmount = 1_000_000_000;

      await surfpool.setTokenAccount({
        owner: user.publicKey,
        mint: USDC_MINT,
        amount: usdcAmount,
      });

      const tokenAccount = await connection.getParsedAccountInfo(
        anchor.utils.token.associatedAddress({
          mint: USDC_MINT,
          owner: user.publicKey,
        })
      );
      expect(tokenAccount.value).toBeDefined();

      const parsedData = tokenAccount.value!.data as any;
      expect(parsedData.parsed.info.tokenAmount.uiAmount).toBe(1000);
    });

    test("create user payment for USDC mint", async () => {
      await sdk.updateWallet(new anchor.Wallet(user));

      userPaymentPDA = getUserPaymentPda(
        user.publicKey,
        USDC_MINT,
        program.programId
      ).address;

      const createUserPaymentIx = await sdk.createUserPayment(USDC_MINT);
      const tx = new Transaction().add(createUserPaymentIx);

      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed",
      });

      const userPayment = await sdk.getUserPayment(userPaymentPDA);

      expect(userPayment).not.toBeNull();
      expect(userPayment!.owner).toEqual(user.publicKey);
      expect(userPayment!.tokenMint).toEqual(USDC_MINT);
      expect(userPayment!.createdPoliciesCount).toBe(0);
      expect(userPayment!.isActive).toBe(true);
    });
  });
});
