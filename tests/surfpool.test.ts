import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Tributary } from "../packages/sdk/src/sdk";
import { getConfigPda, getGatewayPda, getUserPaymentPda } from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { Tributary as TributaryIdl } from "../target/types/tributary";

const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

describe("Surfpool - Mainnet Integration", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<TributaryIdl>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let surfpool: SurfpoolHelper;
  let sdk: Tributary;

  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
  const feeRecipient = Keypair.generate();
  const gatewayAuthority = Keypair.generate();
  const configPDA = getConfigPda(program.programId).address;
  const user = Keypair.generate();

  let userPaymentPDA: PublicKey;
  let gatewayPDA: PublicKey;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    const isSurfpool = await surfpool.isSurfpool();
    if (!isSurfpool) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    sdk = new Tributary(connection, wallet.payer);

    const configAccount = await sdk.getProgramConfig(configPDA);
    configAccount.admin = admin.publicKey;
    const serialized = await program.coder.accounts.encode(
      "programConfig",
      configAccount
    );
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });
  })

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

    test("create gateway", async () => {
      await sdk.updateWallet(new anchor.Wallet(admin));

      gatewayPDA = getGatewayPda(gatewayAuthority.publicKey, program.programId).address;

      const gatewayIx = await sdk.createPaymentGateway(
        gatewayAuthority.publicKey,
        0, // 0 bps gateway fee — simplifies math
        feeRecipient.publicKey, // fee recipient
        "Gateway",
        "https://tributary.so"
      );
      const tx = new Transaction().add(gatewayIx);

      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed",
      });

      const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);

      expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
      expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
      expect(gatewayAccount!.gatewayFeeBps).toBe(0);
      expect(gatewayAccount!.isActive).toBe(true);
      expect(gatewayAccount!.createdAt.toNumber()).toBeGreaterThan(0);
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
