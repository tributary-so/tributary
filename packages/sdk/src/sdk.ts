import {
  Connection,
  Keypair,
  PublicKey,
  SignatureStatus,
  SystemProgram,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createApproveInstruction,
  createRevokeInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getPaymentPolicyPda,
  getPaymentsDelegatePda,
  getReferralPda,
} from "./pda";
import type {
  IWallet,
  PolicyType,
  PaymentFrequency,
  UserPayment,
  PaymentPolicy,
  PaymentGateway,
  ProgramConfig,
  ReferralAccount,
} from "./types.js";
import { GATEWAY_FEATURES } from "./constants";
import {
  computePaymentsPerYear,
  encodeMemo,
  generateSecureRandomString,
  sleep,
} from "./utils";
import IDL from "../../../target/idl/tributary.json"; // with { type: "json" };
import { Tributary as TributaryIdl } from "../../../target/types/tributary.js";

/**
 * Anchor Program type for the Recurring Payments smart contract.
 */
export type Program = anchor.Program<TributaryIdl>;

/**
 * Main SDK class for interacting with the Tributary recurring payments protocol on Solana.
 * Provides methods to create payment gateways, user accounts, payment policies, and execute payments.
 *
 * @example
 * ```typescript
 * const connection = new Connection("https://api.mainnet-beta.solana.com");
 * const wallet = new Wallet(Keypair.generate());
 * const sdk = new Tributary(connection, wallet);
 *
 * // Initialize the protocol (admin only)
 * const initIx = await sdk.initialize(adminPublicKey);
 * ```
 */
export class Tributary {
  /** Anchor program instance for the Recurring Payments contract */
  program: anchor.Program<TributaryIdl>;
  /** Public key of the deployed program */
  programId: PublicKey;
  /** Solana RPC connection */
  connection: Connection;
  /** Anchor provider with wallet and connection */
  provider: anchor.AnchorProvider;

  /**
   * Creates a new Tributary SDK instance.
   * @param connection - Solana RPC connection to use for all operations
   * @param wallet - Wallet containing the keypair for signing transactions
   */
  constructor(connection: Connection, wallet: Keypair | IWallet) {
    this.connection = connection;
    this.programId = new PublicKey(IDL.address);

    const thisWallet =
      wallet instanceof Keypair
        ? {
            publicKey: wallet.publicKey,
            signTransaction: <T>(tx: T) => {
              (tx as any).sign(wallet);
              return Promise.resolve(tx);
            },
            signAllTransactions: <T>(txs: T[]) => {
              return Promise.resolve(
                txs.map((tx) => {
                  (tx as any).sign(wallet);
                  return tx;
                })
              );
            },
          }
        : wallet;

    this.provider = new anchor.AnchorProvider(this.connection, thisWallet, {
      preflightCommitment: "confirmed",
    });
    this.program = new anchor.Program(IDL as TributaryIdl, this.provider);
  }

  /**
   * Updates the wallet used by the SDK instance.
   * Useful for changing the signer without creating a new SDK instance.
   * @param wallet - New wallet to use for signing transactions
   */
  async updateWallet(wallet: any) {
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      preflightCommitment: "confirmed",
    });
    this.program = new anchor.Program(IDL as TributaryIdl, this.provider);
  }

  /**
   * Initializes the Tributary protocol by creating the program configuration account.
   * This is a one-time setup that must be performed by the protocol admin.
   * @param admin - Public key of the protocol administrator
   * @returns Transaction instruction to initialize the protocol
   */
  async initialize(admin: PublicKey): Promise<TransactionInstruction> {
    const { address: configPda } = getConfigPda(this.programId);

    return await this.program.methods
      .initialize()
      .accountsStrict({
        admin,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Creates a user payment account for tracking payments in a specific token.
   * Each user needs one account per token mint they want to use for payments.
   * @param tokenMint - Public key of the token mint for payments
   * @returns Transaction instruction to create the user payment account
   */
  async createUserPayment(
    tokenMint: PublicKey,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction> {
    const owner = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(
      owner,
      tokenMint
    );
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      owner: owner,
      feePayer: feePayer ?? owner,
      config: configPda,
      tokenAccount: getAssociatedTokenAddressSync(tokenMint, owner),
      tokenMint: tokenMint,
      userPayment: userPaymentPda,
      systemProgram: SystemProgram.programId,
    };

    return await this.program.methods
      .createUserPayment()
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Creates a referral account for the current user within a specific gateway.
   * The referral account stores the user's referral code and tracks their referrer (who referred them).
   * @param gateway - Public key of the gateway this referral account belongs to
   * @param referralCode - 6-character alphanumeric referral code for this user
   * @param referrer - Optional public key of the user who referred this user (L1 referrer)
   * @returns Transaction instruction to create the referral account
   */
  async createReferralAccount(
    gateway: PublicKey,
    referralCode: string,
    referrer?: PublicKey,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction> {
    const owner = this.provider.publicKey;

    if (!this.validateReferralCode(referralCode)) {
      throw new Error(
        `Referral code must be length 6 and alphanumeric (${referralCode} is not!)`
      );
    }

    // Validate and convert referral code
    const codeBytes = encodeMemo(referralCode, 6);

    const referralCodeBuffer = Buffer.from(codeBytes);
    const { address: referralAccountPda } = this.getReferralPda(
      gateway,
      referralCodeBuffer
    );
    const { address: configPda } = getConfigPda(this.programId);

    const accounts: any = {
      owner: owner,
      feePayer: feePayer ?? owner,
      referralAccount: referralAccountPda,
      gateway: gateway,
      config: configPda,
      systemProgram: SystemProgram.programId,
    };

    // If referrer is provided, also pass their ReferralAccount for validation
    const remainingAccounts = [];
    if (referrer) {
      const referrerAccount = await this.getReferralAccountByOwner(
        gateway,
        referrer
      );
      if (!referrerAccount) {
        throw new Error("Referrer not found");
      }
      const referrerReferralPda = this.getReferralPda(
        gateway,
        Buffer.from(referrerAccount.referralCode)
      );
      remainingAccounts.push({
        pubkey: referrerReferralPda.address,
        isWritable: false,
        isSigner: false,
      });
    }

    return await this.program.methods
      .createReferralAccount(codeBytes)
      .accountsStrict(accounts)
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  /**
   * Updates the referral settings for a payment gateway.
   * Only the gateway authority can update these settings.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param featureFlags - Bit flags to enable/disable features (bit 0 = referral enabled)
   * @param referralAllocationBps - Basis points of gateway fee allocated to referral rewards (0-2500)
   * @param referralTiersBps - Array of 3 values [L1, L2, L3] summing to 10000 bps
   * @returns Transaction instruction to update gateway referral settings
   */
  async updateGatewayReferralSettings(
    gatewayAuthority: PublicKey,
    featureFlags: number,
    referralAllocationBps: number,
    referralTiersBps: [number, number, number]
  ): Promise<TransactionInstruction> {
    const authority = this.provider.publicKey;
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const { address: configPda } = getConfigPda(this.programId);

    // Validate tiers sum to 10000 bps
    const tiersSum =
      referralTiersBps[0] + referralTiersBps[1] + referralTiersBps[2];
    if (tiersSum !== 10000) {
      throw new Error("Referral tiers must sum to 10000 bps");
    }

    // Validate allocation
    if (referralAllocationBps > 2500) {
      throw new Error("Referral allocation cannot exceed 2500 bps (25%)");
    }

    const accounts = {
      authority: authority,
      gateway: gatewayPda,
      config: configPda,
    };

    return await this.program.methods
      .updateGatewayReferralSettings({
        featureFlags,
        referralAllocationBps,
        referralTiersBps,
      })
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Gets a Referral Account PDA for the specified gateway and referral code.
   * @param gateway - Public key of the gateway
   * @param referralCode - 6-byte buffer of the referral code
   * @returns PdaResult containing the PDA address and bump
   */
  getReferralPda(gateway: PublicKey, referralCode: Buffer) {
    return getReferralPda(gateway, referralCode, this.programId);
  }

  /**
   * Validates a referral code format.
   * Referral codes must be exactly 6 alphanumeric characters.
   * @param code - The referral code to validate
   * @returns true if valid, false otherwise
   */
  validateReferralCode(code: string): boolean {
    if (!code || code.length !== 6) {
      return false;
    }
    for (let i = 0; i < code.length; i++) {
      const byte = code.charCodeAt(i);
      if (
        !(
          (byte >= 48 && byte <= 57) || // 0-9
          (byte >= 65 && byte <= 90) || // A-Z
          (byte >= 97 && byte <= 122)
        )
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Fetches a referral account by gateway and referral code.
   * @param gateway - Public key of the gateway
   * @param code - 6-character alphanumeric referral code
   * @returns The referral account data or null if not found
   */
  async getReferralAccountByCode(
    gateway: PublicKey,
    code: string
  ): Promise<ReferralAccount | null> {
    if (!this.validateReferralCode(code)) {
      return null;
    }
    const codeBuffer = Buffer.from(code, "utf8");
    const { address: referralAccountPda } = this.getReferralPda(
      gateway,
      codeBuffer
    );
    return await this.program.account.referralAccount.fetchNullable(
      referralAccountPda
    );
  }

  /**
   * Creates a new payment gateway for processing recurring payments.
   * Gateways can charge fees and execute payments on behalf of users.
   * @param authority - Public key that controls the gateway
   * @param gatewayFeeBps - Fee in basis points (100 bps = 1%) charged by the gateway
   * @param gatewayFeeRecipient - Public key that receives gateway fees
   * @param name - Display name for the gateway (max 32 characters)
   * @param url - Website URL for the gateway (max 64 characters)
   * @returns Transaction instruction to create the payment gateway
   */
  async createPaymentGateway(
    authority: PublicKey,
    gatewayFeeBps: number,
    gatewayFeeRecipient: PublicKey,
    name: string,
    url: string
  ): Promise<TransactionInstruction> {
    const admin = this.provider.publicKey;
    const gateway = this.getGatewayPda(authority).address;
    const { address: configPda } = getConfigPda(this.programId);

    // Convert strings to fixed-size byte arrays
    const nameBytes = new Array(32).fill(0);
    const nameBuffer = Buffer.from(name, "utf8");
    for (let i = 0; i < Math.min(nameBuffer.length, 32); i++) {
      nameBytes[i] = nameBuffer[i];
    }

    const urlBytes = new Array(64).fill(0);
    const urlBuffer = Buffer.from(url, "utf8");
    for (let i = 0; i < Math.min(urlBuffer.length, 64); i++) {
      urlBytes[i] = urlBuffer[i];
    }

    const accounts = {
      admin: admin,
      authority: authority,
      gateway: gateway,
      config: configPda,
      feeRecipient: gatewayFeeRecipient,
      systemProgram: SystemProgram.programId,
    };
    return await this.program.methods
      .createPaymentGateway(gatewayFeeBps, nameBytes, urlBytes)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Gets a transaction instruction to create a subscription payment policy.
   * This is a low-level method that returns only the instruction.
   * Use createSubscription() for the full setup including ATAs and approvals.
   * @param tokenMint - Public key of the token to be paid
   * @param recipient - Public key that receives the payments
   * @param gateway - Public key of the gateway that will execute payments
   * @param amount - Amount to pay per interval (in smallest token units)
   * @param autoRenew - Whether the subscription should auto-renew
   * @param maxRenewals - Maximum number of renewals allowed (null for unlimited)
   * @param paymentFrequency - How often payments should occur
   * @param memo - Memo bytes to include with payments (max 64 bytes)
   * @param startTime - When the first payment should occur (defaults to now)
   * @returns Transaction instruction to create the subscription payment policy
   */
  async getCreateSubscriptionPolicyInstruction(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    amount: BN,
    autoRenew: boolean,
    maxRenewals: number | null,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: BN | null,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction> {
    const user = this.provider.publicKey;
    const { address: configPda } = getConfigPda(this.programId);
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.createdPoliciesCount + 1;
    }
    const paymentPolicy = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const nextPaymentDue = startTime || new BN(Math.floor(Date.now() / 1000));
    const policyType: PolicyType = {
      subscription: {
        amount: amount,
        autoRenew: autoRenew,
        maxRenewals: maxRenewals,
        paymentFrequency: paymentFrequency,
        nextPaymentDue: nextPaymentDue,
        padding: new Array(97).fill(0),
      },
    };
    const accounts = {
      user: user,
      feePayer: feePayer ?? user,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      config: configPda,
      paymentPolicy: paymentPolicy.address,
      systemProgram: SystemProgram.programId,
    };
    return await this.program.methods
      .createPaymentPolicy(policyType, memo)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Gets a transaction instruction to create a pay-as-you-go payment policy.
   * This is a low-level method that returns only the instruction.
   * Use createPayAsYouGoPayment() for the full setup including ATAs and approvals.
   * @param tokenMint - Public key of the token to be paid
   * @param recipient - Public key that receives the payments
   * @param gateway - Public key of the gateway that will execute payments
   * @param maxAmountPerPeriod - Maximum amount allowed per period
   * @param maxChunkAmount - Maximum amount that can be claimed in a single payment
   * @param periodLengthSeconds - Length of each period in seconds
   * @param memo - Memo bytes to include with payments (max 64 bytes)
   * @returns Transaction instruction to create the pay-as-you-go payment policy
   */
  async getCreatePayAsYouGoPolicyInstruction(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    maxAmountPerPeriod: BN,
    maxChunkAmount: BN,
    periodLengthSeconds: BN,
    memo: number[],
    feePayer?: PublicKey
  ): Promise<TransactionInstruction> {
    const user = this.provider.publicKey;
    const { address: configPda } = getConfigPda(this.programId);
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.createdPoliciesCount + 1;
    }
    const paymentPolicy = this.getPaymentPolicyPda(userPaymentPda, policyId);

    // Validate inputs
    if (maxAmountPerPeriod.lte(new BN(0))) {
      throw new Error("maxAmountPerPeriod must be greater than 0");
    }
    if (maxChunkAmount.lte(new BN(0))) {
      throw new Error("maxChunkAmount must be greater than 0");
    }
    if (maxChunkAmount.gt(maxAmountPerPeriod)) {
      throw new Error("maxChunkAmount cannot exceed maxAmountPerPeriod");
    }
    if (periodLengthSeconds.lte(new BN(0))) {
      throw new Error("periodLengthSeconds must be greater than 0");
    }

    const policyType: PolicyType = {
      payAsYouGo: {
        maxAmountPerPeriod: maxAmountPerPeriod,
        maxChunkAmount: maxChunkAmount,
        periodLengthSeconds: periodLengthSeconds,
        currentPeriodStart: new BN(Math.floor(Date.now() / 1000)), // Initialize to current time
        currentPeriodTotal: new BN(0), // Initialize to 0
        padding: new Array(88).fill(0),
      },
    };
    const accounts = {
      user: user,
      feePayer: feePayer ?? user,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      config: configPda,
      paymentPolicy: paymentPolicy.address,
      systemProgram: SystemProgram.programId,
    };
    return await this.program.methods
      .createPaymentPolicy(policyType, memo)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Gets a transaction instruction to create a milestone payment policy.
   * This is a low-level method that returns only the instruction.
   * Use createMilestonePayment() for the full setup including ATAs and approvals.
   * @param tokenMint - Public key of the token to be paid
   * @param recipient - Public key that receives the payments
   * @param gateway - Public key of the gateway that will execute payments
   * @param milestoneAmounts - Array of amounts for each milestone (up to 4)
   * @param milestoneTimestamps - Array of timestamps when each milestone is due
   * @param releaseCondition - Bitmap: bit0=check due date, bit1=gateway signer, bit2=owner signer, bit3=recipient signer. Bits 1-3 mutually exclusive.
   * @param memo - Memo bytes to include with payments (max 64 bytes)
   * @returns Transaction instruction to create the milestone payment policy
   */
  async getCreateMilestonePolicyInstruction(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    milestoneAmounts: BN[],
    milestoneTimestamps: BN[],
    releaseCondition: number,
    memo: number[],
    feePayer?: PublicKey
  ): Promise<TransactionInstruction> {
    const user = this.provider.publicKey;
    const { address: configPda } = getConfigPda(this.programId);
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.createdPoliciesCount + 1;
    }
    const paymentPolicy = this.getPaymentPolicyPda(userPaymentPda, policyId);

    // Validate inputs
    if (milestoneAmounts.length === 0 || milestoneAmounts.length > 4) {
      throw new Error("Milestone payments must have 1-4 milestones");
    }
    if (milestoneAmounts.length !== milestoneTimestamps.length) {
      throw new Error(
        "Milestone amounts and timestamps arrays must have the same length"
      );
    }
    if (releaseCondition < 0 || releaseCondition > 15) {
      throw new Error(
        "Release condition must be 0-15 (bitmap: bit0=due date, bits1-3=signer)"
      );
    }
    // Check that signer bits are mutually exclusive (bits 1-3)
    const signerBits = (releaseCondition >> 1) & 0b0111;
    // signerBits must be 0 (none), 1 (gateway), 2 (owner), or 4 (recipient)
    const validSignerBits = [0, 1, 2, 4];
    if (!validSignerBits.includes(signerBits)) {
      throw new Error(
        "Signer bits must be mutually exclusive (at most one of gateway/owner/recipient)"
      );
    }

    // Calculate total escrow amount
    const escrowAmount = milestoneAmounts.reduce(
      (sum, amount) => sum.add(amount),
      new BN(0)
    );

    // Pad arrays to fixed size
    const paddedAmounts = [
      ...milestoneAmounts,
      ...Array(4 - milestoneAmounts.length).fill(new BN(0)),
    ];
    const paddedTimestamps = [
      ...milestoneTimestamps,
      ...Array(4 - milestoneTimestamps.length).fill(new BN(0)),
    ];

    const policyType: PolicyType = {
      milestone: {
        milestoneAmounts: paddedAmounts,
        milestoneTimestamps: paddedTimestamps,
        currentMilestone: 0,
        releaseCondition: releaseCondition,
        totalMilestones: milestoneAmounts.length,
        escrowAmount: escrowAmount,
        padding: new Array(53).fill(0),
      },
    };

    const accounts = {
      user: user,
      feePayer: feePayer ?? user,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      config: configPda,
      paymentPolicy: paymentPolicy.address,
      systemProgram: SystemProgram.programId,
    };

    return await this.program.methods
      .createPaymentPolicy(policyType, memo)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Creates a complete subscription setup including ATAs, user payment account, policy, and token approvals.
   * This is the high-level method for creating subscriptions that handles all the setup automatically.
   * @param tokenMint - Public key of the token to be paid
   * @param recipient - Public key that receives the payments
   * @param gateway - Public key of the gateway that will execute payments
   * @param amount - Amount to pay per interval (in smallest token units)
   * @param autoRenew - Whether the subscription should auto-renew
   * @param maxRenewals - Maximum number of renewals allowed (null for unlimited)
   * @param paymentFrequency - How often payments should occur
   * @param memo - Memo bytes to include with payments (max 64 bytes)
   * @param startTime - When the first payment should occur (defaults to now)
   * @param approvalAmount - Amount to approve for token delegation (calculated automatically if not provided)
   * @param executeImmediately - Whether to execute the first payment immediately
   * @param referralCode - Optional 6-character referral code to associate with this subscription
   * @returns Array of transaction instructions for the complete subscription setup
   */
  async createSubscription(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    amount: BN,
    autoRenew: boolean,
    maxRenewals: number | null,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: BN | null,
    approvalAmount?: BN,
    executeImmediately?: boolean,
    referralCode?: string,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction[]> {
    const user = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);

    const instructions: TransactionInstruction[] = [];

    const ownerTokenAccount = getAssociatedTokenAddressSync(tokenMint, user);
    const accountInfo = await this.connection.getAccountInfo(ownerTokenAccount);

    if (!accountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        user,
        ownerTokenAccount,
        user,
        tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      instructions.push(createAtaIx);
    }

    // Check if userPayment already exists
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);

    // If userPayment doesn't exist, create it first
    if (!userPayment) {
      const createUserPaymentIx = await this.createUserPayment(tokenMint);
      instructions.push(createUserPaymentIx);
    }

    if (referralCode) {
      if (!this.validateReferralCode(referralCode)) {
        throw new Error(
          "Referral code must be exactly 6 alphanumeric characters"
        );
      }
      const referralAccount = await this.getReferralAccountByCode(
        gateway,
        referralCode
      );
      if (!referralAccount) {
        throw new Error("Referral Code unknown");
      }
      const createReferralIx = await this.createReferralAccount(
        gateway,
        generateSecureRandomString(6),
        referralAccount.owner
      );
      instructions.push(createReferralIx);
    }

    // Build policy type
    const nextPaymentDue = startTime || new BN(Math.floor(Date.now() / 1000));
    const policyType: PolicyType = {
      subscription: {
        amount: amount,
        autoRenew: autoRenew,
        maxRenewals: maxRenewals,
        paymentFrequency: paymentFrequency,
        nextPaymentDue: nextPaymentDue,
        padding: new Array(97).fill(0),
      },
    };

    // Determine policy ID
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.createdPoliciesCount + 1;
    }
    const paymentPolicyPda = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      user: user,
      feePayer: feePayer ?? user,
      config: configPda,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicyPda.address,
      systemProgram: SystemProgram.programId,
    };

    // Create payment policy instruction
    const createPaymentPolicyIx = await this.program.methods
      .createPaymentPolicy(policyType, memo)
      .accountsStrict(accounts)
      .instruction();

    instructions.push(createPaymentPolicyIx);

    // Calculate or use provided approval amount
    let finalApprovalAmount: BN;
    if (approvalAmount) {
      finalApprovalAmount = approvalAmount;
    } else {
      const existingApproval = await this.getTotalApprovalForExistingPolicies(
        userPaymentPda
      );
      const newApproval = this.calculateSubscriptionApprovalAmount(
        amount,
        paymentFrequency,
        maxRenewals
      );
      finalApprovalAmount = existingApproval.add(newApproval);
    }

    // Set up approval if needed
    const paymentsDelegatePda = this.getPaymentsDelegatePda().address;
    const userPaymentDelegate = userPaymentPda;
    const delegate = userPaymentDelegate;
    let needsApproval = false;

    const tokenAccountInfo = await this.connection.getParsedAccountInfo(
      ownerTokenAccount
    );

    if (tokenAccountInfo.value?.data) {
      const parsedData = tokenAccountInfo.value.data as any;
      const currentDelegate = parsedData.parsed?.info?.delegate;
      const currentDelegatedAmount =
        parsedData.parsed?.info?.delegatedAmount?.amount;

      if (!currentDelegate) {
        needsApproval = true;
      } else if (
        currentDelegate !== delegate.toString() &&
        currentDelegate !== paymentsDelegatePda.toString()
      ) {
        needsApproval = true;
      } else if (
        currentDelegate === delegate.toString() &&
        currentDelegatedAmount < finalApprovalAmount.toNumber()
      ) {
        needsApproval = true;
      } else if (currentDelegate === paymentsDelegatePda.toString()) {
        needsApproval = true;
      }
    } else {
      needsApproval = true;
    }

    if (needsApproval) {
      const revokeIx = this.getRevokeInstruction(ownerTokenAccount, user);
      const approveIx = this.getApprovalInstruction(
        ownerTokenAccount,
        delegate,
        user,
        finalApprovalAmount
      );
      instructions.push(revokeIx);
      instructions.push(approveIx);
    }

    if (executeImmediately) {
      const executePaymentIxs = await this.executePayment(
        paymentPolicyPda.address,
        undefined, // paymentAmount - will be determined by policy type
        recipient,
        tokenMint,
        gateway,
        user
      );
      instructions.push(...executePaymentIxs);
    }

    return instructions;
  }

  /**
   * Creates a milestone payment policy with full setup including ATAs, user payment account, and token approvals.
   * Use getCreateMilestonePolicyInstruction() for just the instruction without setup.
   * @param tokenMint - Public key of the token mint
   * @param recipient - Public key of the payment recipient
   * @param gateway - Public key of the payment gateway
   * @param milestoneAmounts - Array of amounts for each milestone (up to 4)
   * @param milestoneTimestamps - Array of timestamps when each milestone is due
   * @param releaseCondition - Bitmap: bit0=check due date, bit1=gateway signer, bit2=owner signer, bit3=recipient signer. Bits 1-3 mutually exclusive.
   * @param memo - Memo bytes for the payment policy
   * @param approvalAmount - Optional specific approval amount (calculated automatically if not provided)
   * @param executeImmediately - Whether to execute the first milestone immediately if due
   * @returns Array of transaction instructions for complete setup
   */
  async createMilestone(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    milestoneAmounts: BN[],
    milestoneTimestamps: BN[],
    releaseCondition: number,
    memo: number[],
    approvalAmount?: BN,
    executeImmediately?: boolean,
    referralCode?: string,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction[]> {
    const user = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);

    const instructions: TransactionInstruction[] = [];

    // Validate release condition bitmap
    if (releaseCondition < 0 || releaseCondition > 15) {
      throw new Error(
        "Release condition must be 0-15 (bitmap: bit0=due date, bits1-3=signer)"
      );
    }
    // Check that signer bits are mutually exclusive (bits 1-3)
    const signerBits = (releaseCondition >> 1) & 0b0111;
    // signerBits must be 0 (none), 1 (gateway), 2 (owner), or 4 (recipient)
    const validSignerBits = [0, 1, 2, 4];
    if (!validSignerBits.includes(signerBits)) {
      throw new Error(
        "Signer bits must be mutually exclusive (at most one of gateway/owner/recipient)"
      );
    }
    const ownerTokenAccount = getAssociatedTokenAddressSync(tokenMint, user);
    const accountInfo = await this.connection.getAccountInfo(ownerTokenAccount);

    if (!accountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        user,
        ownerTokenAccount,
        user,
        tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      instructions.push(createAtaIx);
    }

    // Check if userPayment already exists
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);

    // If userPayment doesn't exist, create it first
    if (!userPayment) {
      const createUserPaymentIx = await this.createUserPayment(tokenMint);
      instructions.push(createUserPaymentIx);
    }

    if (referralCode) {
      if (!this.validateReferralCode(referralCode)) {
        throw new Error(
          "Referral code must be exactly 6 alphanumeric characters"
        );
      }
      const referralAccount = await this.getReferralAccountByCode(
        gateway,
        referralCode
      );
      if (!referralAccount) {
        throw new Error("Referral Code unknown");
      }
      const createReferralIx = await this.createReferralAccount(
        gateway,
        generateSecureRandomString(6),
        referralAccount.owner
      );
      instructions.push(createReferralIx);
    }

    // Build policy type
    const escrowAmount = milestoneAmounts.reduce(
      (sum, amount) => sum.add(amount),
      new BN(0)
    );
    const paddedAmounts = [
      ...milestoneAmounts,
      ...Array(4 - milestoneAmounts.length).fill(new BN(0)),
    ];
    const paddedTimestamps = [
      ...milestoneTimestamps,
      ...Array(4 - milestoneTimestamps.length).fill(new BN(0)),
    ];

    const policyType: PolicyType = {
      milestone: {
        milestoneAmounts: paddedAmounts,
        milestoneTimestamps: paddedTimestamps,
        currentMilestone: 0,
        releaseCondition: releaseCondition,
        totalMilestones: milestoneAmounts.length,
        escrowAmount: escrowAmount,
        padding: new Array(53).fill(0),
      },
    };

    // Determine policy ID
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.createdPoliciesCount + 1;
    }
    const paymentPolicyPda = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      user: user,
      feePayer: feePayer ?? user,
      config: configPda,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicyPda.address,
      systemProgram: SystemProgram.programId,
    };

    // Create payment policy instruction
    const createPaymentPolicyIx = await this.program.methods
      .createPaymentPolicy(policyType, memo)
      .accountsStrict(accounts)
      .instruction();

    instructions.push(createPaymentPolicyIx);

    // Calculate or use provided approval amount
    let finalApprovalAmount: BN;
    if (approvalAmount) {
      finalApprovalAmount = approvalAmount;
    } else {
      const existingApproval = await this.getTotalApprovalForExistingPolicies(
        userPaymentPda
      );
      const newApproval =
        this.calculateMilestoneApprovalAmount(milestoneAmounts);
      finalApprovalAmount = existingApproval.add(newApproval);
    }

    const paymentsDelegatePda = this.getPaymentsDelegatePda().address;
    const userPaymentDelegate = userPaymentPda;
    const delegate = userPaymentDelegate;
    let needsApproval = false;

    const tokenAccountInfo = await this.connection.getParsedAccountInfo(
      ownerTokenAccount
    );

    if (tokenAccountInfo.value?.data) {
      const parsedData = tokenAccountInfo.value.data as any;
      const currentDelegate = parsedData.parsed?.info?.delegate;
      const currentDelegatedAmount =
        parsedData.parsed?.info?.delegatedAmount?.amount;

      if (!currentDelegate) {
        needsApproval = true;
      } else if (
        currentDelegate !== delegate.toString() &&
        currentDelegate !== paymentsDelegatePda.toString()
      ) {
        needsApproval = true;
      } else if (
        currentDelegate === delegate.toString() &&
        currentDelegatedAmount !== finalApprovalAmount.toString()
      ) {
        needsApproval = true;
      } else if (currentDelegate === paymentsDelegatePda.toString()) {
        needsApproval = true;
      }
    } else {
      needsApproval = true;
    }

    if (needsApproval) {
      const revokeIx = this.getRevokeInstruction(ownerTokenAccount, user);
      const approveIx = this.getApprovalInstruction(
        ownerTokenAccount,
        delegate,
        user,
        finalApprovalAmount
      );
      instructions.push(revokeIx);
      instructions.push(approveIx);
    }

    if (executeImmediately) {
      const executePaymentIxs = await this.executePayment(
        paymentPolicyPda.address,
        undefined, // paymentAmount - will be determined by policy type
        recipient,
        tokenMint,
        gateway,
        user
      );
      instructions.push(...executePaymentIxs);
    }

    return instructions;
  }

  /**
   * Creates a pay-as-you-go payment policy with full setup including ATAs, user payment account, and token approvals.
   * Use getCreatePayAsYouGoPolicyInstruction() for just the instruction without setup.
   * @param tokenMint - Public key of the token mint
   * @param recipient - Public key of the payment recipient
   * @param gateway - Public key of the payment gateway
   * @param maxAmountPerPeriod - Maximum amount allowed per period
   * @param maxChunkAmount - Maximum amount that can be claimed in one go
   * @param periodLengthSeconds - Length of each period in seconds
   * @param memo - Memo bytes for the payment policy
   * @param approvalAmount - Optional specific approval amount (calculated automatically if not provided)
   * @returns Array of transaction instructions for complete setup
   */
  async createPayAsYouGo(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    maxAmountPerPeriod: BN,
    maxChunkAmount: BN,
    periodLengthSeconds: BN,
    memo: number[],
    approvalAmount?: BN,
    referralCode?: string,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction[]> {
    const user = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);

    const instructions: TransactionInstruction[] = [];

    const ownerTokenAccount = getAssociatedTokenAddressSync(tokenMint, user);
    const accountInfo = await this.connection.getAccountInfo(ownerTokenAccount);

    if (!accountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        user,
        ownerTokenAccount,
        user,
        tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      instructions.push(createAtaIx);
    }

    // Check if userPayment already exists
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);

    // If userPayment doesn't exist, create it first
    if (!userPayment) {
      const createUserPaymentIx = await this.createUserPayment(tokenMint);
      instructions.push(createUserPaymentIx);
    }

    if (referralCode) {
      if (!this.validateReferralCode(referralCode)) {
        throw new Error(
          "Referral code must be exactly 6 alphanumeric characters"
        );
      }
      const referralAccount = await this.getReferralAccountByCode(
        gateway,
        referralCode
      );
      if (!referralAccount) {
        throw new Error("Referral Code unknown");
      }
      const createReferralIx = await this.createReferralAccount(
        gateway,
        generateSecureRandomString(6),
        referralAccount.owner
      );
      instructions.push(createReferralIx);
    }

    // Build policy type
    const currentTime = Math.floor(Date.now() / 1000);
    const policyType: PolicyType = {
      payAsYouGo: {
        maxAmountPerPeriod: maxAmountPerPeriod,
        maxChunkAmount: maxChunkAmount,
        periodLengthSeconds: periodLengthSeconds,
        currentPeriodStart: new BN(currentTime),
        currentPeriodTotal: new BN(0),
        padding: new Array(88).fill(0),
      },
    };

    // Determine policy ID
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.createdPoliciesCount + 1;
    }
    const paymentPolicyPda = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      user: user,
      feePayer: feePayer ?? user,
      config: configPda,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicyPda.address,
      systemProgram: SystemProgram.programId,
    };

    // Create payment policy instruction
    const createPaymentPolicyIx = await this.program.methods
      .createPaymentPolicy(policyType, memo)
      .accountsStrict(accounts)
      .instruction();

    instructions.push(createPaymentPolicyIx);

    // Calculate or use provided approval amount
    let finalApprovalAmount: BN;
    if (approvalAmount) {
      finalApprovalAmount = approvalAmount;
    } else {
      const existingApproval = await this.getTotalApprovalForExistingPolicies(
        userPaymentPda
      );
      const newApproval = this.calculatePayAsYouGoApprovalAmount(
        maxAmountPerPeriod,
        periodLengthSeconds
      );
      finalApprovalAmount = existingApproval.add(newApproval);
    }

    const paymentsDelegatePda = this.getPaymentsDelegatePda().address;
    const userPaymentDelegate = userPaymentPda;
    const delegate = userPaymentDelegate;
    let needsApproval = false;

    const tokenAccountInfo = await this.connection.getParsedAccountInfo(
      ownerTokenAccount
    );

    if (tokenAccountInfo.value?.data) {
      const parsedData = tokenAccountInfo.value.data as any;
      const currentDelegate = parsedData.parsed?.info?.delegate;
      const currentDelegatedAmount =
        parsedData.parsed?.info?.delegatedAmount?.amount;

      if (!currentDelegate) {
        needsApproval = true;
      } else if (
        currentDelegate !== delegate.toString() &&
        currentDelegate !== paymentsDelegatePda.toString()
      ) {
        needsApproval = true;
      } else if (
        currentDelegate === delegate.toString() &&
        currentDelegatedAmount !== finalApprovalAmount.toString()
      ) {
        needsApproval = true;
      } else if (currentDelegate === paymentsDelegatePda.toString()) {
        needsApproval = true;
      }
    } else {
      needsApproval = true;
    }

    if (needsApproval) {
      const revokeIx = this.getRevokeInstruction(ownerTokenAccount, user);
      const approveIx = this.getApprovalInstruction(
        ownerTokenAccount,
        delegate,
        user,
        finalApprovalAmount
      );
      instructions.push(revokeIx);
      instructions.push(approveIx);
    }

    return instructions;
  }

  /**
   * Executes a payment for a given payment policy.
   * This method handles the complete payment execution flow including fee calculations and token transfers.
   * @param paymentPolicyPda - Public key of the payment policy account
   * @param paymentAmount - Amount to pay (optional for subscription/milestone, required for pay-as-you-go)
   * @param recipient - Public key of the payment recipient (optional if in policy)
   * @param tokenMint - Public key of the token mint (optional if in policy)
   * @param gateway - Public key of the payment gateway (optional if in policy)
   * @param user - Public key of the payment user (optional if in policy)
   * @returns Array of transaction instructions including ATA creation and payment execution
   */
  async executePayment(
    paymentPolicyPda: PublicKey,
    paymentAmount?: BN,
    recipient?: PublicKey,
    tokenMint?: PublicKey,
    gateway?: PublicKey,
    user?: PublicKey
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    const authority = this.provider.publicKey;
    let _tokenMint: PublicKey | undefined = undefined;
    let _recipient: PublicKey | undefined = undefined;
    let _gateway: PublicKey | undefined = undefined;
    let _user: PublicKey | undefined = undefined;

    const paymentPolicy: PaymentPolicy | null =
      await this.program.account.paymentPolicy.fetchNullable(paymentPolicyPda);

    let userPayment: UserPayment | null = null;
    if (paymentPolicy) {
      const userPaymentPda = paymentPolicy.userPayment;

      _gateway = paymentPolicy.gateway;
      _recipient = paymentPolicy.recipient;

      userPayment = await this.program.account.userPayment.fetchNullable(
        userPaymentPda
      );

      if (userPayment) {
        _tokenMint = userPayment.tokenMint;
        _user = userPayment.owner;
      }
    }

    _tokenMint = _tokenMint || tokenMint;
    _recipient = _recipient || recipient;
    _gateway = _gateway || gateway;
    _user = _user || user;

    if (!_tokenMint) {
      throw new Error(
        "Either provide tokenMint or have a valid paymentPolicy account!"
      );
    }

    if (!_recipient) {
      throw new Error(
        "Either provide recipient or have a valid paymentPolicy account!"
      );
    }

    if (!_gateway) {
      throw new Error(
        "Either provide gateway or have a valid paymentPolicy account!"
      );
    }

    if (!_user) {
      throw new Error(
        "Either provide user or have a valid paymentPolicy account!"
      );
    }

    const gatewayAccount = await this.getPaymentGateway(_gateway);
    const { address: configPda } = getConfigPda(this.programId);
    const config = await this.program.account.programConfig.fetch(configPda);

    const { address: userPaymentPda } = this.getUserPaymentPda(
      _user,
      _tokenMint
    );
    const tokenAccount = getAssociatedTokenAddressSync(_tokenMint, _user);

    // Payment Recipient ATA
    const recipientTokenAccount = getAssociatedTokenAddressSync(
      _tokenMint,
      _recipient
    );
    const recipientAccountInfo = await this.connection.getAccountInfo(
      recipientTokenAccount
    );
    if (!recipientAccountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        authority,
        recipientTokenAccount,
        _recipient,
        _tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      instructions.push(createAtaIx);
    }

    // Gateway Fee account ATA
    const gatewayFeeAccount = getAssociatedTokenAddressSync(
      _tokenMint,
      gatewayAccount!.feeRecipient
    );
    const gatewayFeeAccountInfo = await this.connection.getAccountInfo(
      gatewayFeeAccount
    );
    if (!gatewayFeeAccountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        authority,
        gatewayFeeAccount,
        gatewayAccount!.feeRecipient,
        _tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      instructions.push(createAtaIx);
    }

    // Protocol Fee account ATA
    const protocolFeeAccount = getAssociatedTokenAddressSync(
      _tokenMint,
      config!.feeRecipient
    );
    const protocolFeeAccountInfo = await this.connection.getAccountInfo(
      protocolFeeAccount
    );
    if (!protocolFeeAccountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        authority,
        protocolFeeAccount,
        config!.feeRecipient,
        _tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      instructions.push(createAtaIx);
    }

    const accounts = {
      feePayer: authority,
      paymentsDelegate: this.getPaymentsDelegatePda().address,
      paymentPolicy: paymentPolicyPda,
      userPayment: userPaymentPda,
      gateway: _gateway,
      config: configPda,
      userTokenAccount: tokenAccount,
      recipientTokenAccount,
      gatewayFeeAccount: gatewayFeeAccount,
      protocolFeeAccount: protocolFeeAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      mint: _tokenMint,
    };

    // Build instruction with remaining accounts for referrals
    let executeIx = await this.program.methods
      .executePayment(paymentAmount || null)
      .accountsStrict(accounts)
      .instruction();

    // Check if referral is enabled and build referral chain
    if (
      gatewayAccount &&
      gatewayAccount.featureFlags &&
      gatewayAccount.referralAllocationBps > 0
    ) {
      // Check if bit 0 is set (referral enabled)
      const referralEnabled =
        (gatewayAccount.featureFlags & GATEWAY_FEATURES.REFERRAL) !== 0;

      if (referralEnabled && _user) {
        // Build the referral chain
        const referralChain = await this.getReferralChain(_user, _gateway!);

        // Filter out nulls and get the referral account addresses
        const referralAccounts = referralChain.filter(
          (ref): ref is PublicKey => ref !== null
        );

        if (referralAccounts.length > 0) {
          // Get the actual referral account addresses (not just the owner)
          const remainingAccounts = [];

          for (const referrer of referralAccounts) {
            remainingAccounts.push({
              pubkey: referrer,
              isWritable: true,
              isSigner: false,
            });
          }

          for (const referrer of referralAccounts) {
            const referrerAccount = await this.getReferralAccount(referrer);
            if (!referrerAccount) {
              // TODO: create ATA
              throw new Error("missing ATA!");
            }
            remainingAccounts.push({
              pubkey: getAssociatedTokenAddressSync(
                _tokenMint,
                referrerAccount.owner
              ),
              isWritable: true,
              isSigner: false,
            });
          }

          // Create new instruction with remaining accounts
          executeIx = await this.program.methods
            .executePayment(paymentAmount || null)
            .accountsStrict(accounts)
            .remainingAccounts(remainingAccounts)
            .instruction();
        }
      }
    }

    instructions.push(executeIx);

    return instructions;
  }

  // Helper methods to get PDAs

  /**
   * Gets the Program Configuration PDA.
   * @returns PdaResult containing the PDA address and bump
   */
  getConfigPda() {
    return getConfigPda(this.programId);
  }

  /**
   * Gets a Payment Gateway PDA for the specified authority.
   * @param gatewayAuthority - Public key of the gateway authority
   * @returns PdaResult containing the PDA address and bump
   */
  getGatewayPda(gatewayAuthority: PublicKey) {
    return getGatewayPda(gatewayAuthority, this.programId);
  }

  /**
   * Gets a User Payment PDA for the specified user and token mint.
   * @param user - Public key of the user
   * @param tokenMint - Public key of the token mint
   * @returns PdaResult containing the PDA address and bump
   */
  getUserPaymentPda(user: PublicKey, tokenMint: PublicKey) {
    return getUserPaymentPda(user, tokenMint, this.programId);
  }

  /**
   * Gets a Payment Policy PDA for the specified user payment and policy ID.
   * @param userPayment - Public key of the user's payment PDA
   * @param policyId - Unique identifier for the policy within the user's account
   * @returns PdaResult containing the PDA address and bump
   */
  getPaymentPolicyPda(userPayment: PublicKey, policyId: number) {
    return getPaymentPolicyPda(userPayment, policyId, this.programId);
  }

  /**
   * Calculates the total approval amount needed for a subscription.
   * Uses maxRenewals if provided, otherwise defaults to 1 year of payments.
   * @param amount - Payment amount per interval
   * @param frequency - Payment frequency
   * @param maxRenewals - Maximum number of renewals (null for unlimited)
   * @returns Total approval amount needed
   */
  private calculateSubscriptionApprovalAmount(
    amount: BN,
    frequency: PaymentFrequency,
    maxRenewals: number | null
  ): BN {
    const paymentsPerYear = computePaymentsPerYear(frequency);
    const effectiveRenewals =
      maxRenewals !== null ? maxRenewals : paymentsPerYear;
    return amount.mul(new BN(effectiveRenewals));
  }

  /**
   * Calculates total approval amount needed for a milestone payment.
   * @param milestoneAmounts - Array of milestone amounts
   * @returns Total approval amount needed
   */
  private calculateMilestoneApprovalAmount(milestoneAmounts: BN[]): BN {
    return milestoneAmounts.reduce((sum, amount) => sum.add(amount), new BN(0));
  }

  /**
   * Calculates total approval amount needed for a pay-as-you-go payment.
   * Uses maxAmountPerPeriod multiplied by number of periods in a year.
   * @param maxAmountPerPeriod - Maximum amount allowed per period
   * @param periodLengthSeconds - Length of each period in seconds
   * @returns Total approval amount needed (1 year's worth)
   */
  private calculatePayAsYouGoApprovalAmount(
    maxAmountPerPeriod: BN,
    periodLengthSeconds: BN
  ): BN {
    if (periodLengthSeconds.lten(0)) throw Error("Invalid Interval");
    const secondsPerYear = new BN(365 * 24 * 60 * 60);
    const periodsPerYear = secondsPerYear.div(periodLengthSeconds);
    return maxAmountPerPeriod.mul(periodsPerYear);
  }

  /**
   * Calculates total approval amount needed for all existing policies under a user payment account.
   * @param userPaymentPda - Public key of user payment account
   * @returns Total approval amount for all existing policies
   */
  private async getTotalApprovalForExistingPolicies(
    userPaymentPda: PublicKey
  ): Promise<BN> {
    const existingPolicies = await this.getPaymentPoliciesByUserPayment(
      userPaymentPda
    );
    let totalApprovalAmount = new BN(0);

    for (const { account: policy } of existingPolicies) {
      if ("subscription" in policy.policyType) {
        const sub = policy.policyType.subscription!;
        const policyApproval = this.calculateSubscriptionApprovalAmount(
          sub.amount,
          sub.paymentFrequency,
          sub.maxRenewals
        );
        totalApprovalAmount = totalApprovalAmount.add(policyApproval);
      } else if ("milestone" in policy.policyType) {
        const milestone = policy.policyType.milestone!;
        const policyApproval = this.calculateMilestoneApprovalAmount(
          milestone.milestoneAmounts.filter((amount) => !amount.isZero())
        );
        totalApprovalAmount = totalApprovalAmount.add(policyApproval);
      } else if ("payAsYouGo" in policy.policyType) {
        const payg = policy.policyType.payAsYouGo!;
        const policyApproval = this.calculatePayAsYouGoApprovalAmount(
          payg.maxAmountPerPeriod,
          payg.periodLengthSeconds
        );
        totalApprovalAmount = totalApprovalAmount.add(policyApproval);
      }
    }

    return totalApprovalAmount;
  }

  /**
   * Creates a SPL token approval instruction with the specified amount.
   * @param ownerTokenAccount - Token account to approve from
   * @param delegate - Delegate receiving approval authority
   * @param owner - Owner signing the approval
   * @param amount - Amount to approve
   * @returns SPL approve instruction
   */
  private getApprovalInstruction(
    ownerTokenAccount: PublicKey,
    delegate: PublicKey,
    owner: PublicKey,
    amount: BN
  ): TransactionInstruction {
    return createApproveInstruction(
      ownerTokenAccount,
      delegate,
      owner,
      BigInt(amount.toString()),
      [],
      TOKEN_PROGRAM_ID
    );
  }

  private getRevokeInstruction(
    ownerTokenAccount: PublicKey,
    owner: PublicKey
  ): TransactionInstruction {
    return createRevokeInstruction(
      ownerTokenAccount,
      owner,
      [],
      TOKEN_PROGRAM_ID
    );
  }

  /**
   * Migrates token delegation from the legacy global payments_delegate PDA
   * to the per-user UserPayment PDA. Revokes the old delegate, then approves
   * the new one with the specified amount.
   * @param tokenMint - Public key of the token mint
   * @param approvalAmount - Amount to approve for the new delegate
   * @returns Array of [revoke, approve] transaction instructions
   */
  async migrateDelegate(
    tokenMint: PublicKey,
    approvalAmount: BN
  ): Promise<TransactionInstruction[]> {
    const owner = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(
      owner,
      tokenMint
    );
    const ownerTokenAccount = getAssociatedTokenAddressSync(tokenMint, owner);
    const { address: legacyDelegate } = this.getPaymentsDelegatePda();

    const instructions: TransactionInstruction[] = [];

    const tokenAccountInfo = await this.connection.getParsedAccountInfo(
      ownerTokenAccount
    );

    if (tokenAccountInfo.value?.data) {
      const parsedData = tokenAccountInfo.value.data as any;
      const currentDelegate = parsedData.parsed?.info?.delegate;

      if (currentDelegate === legacyDelegate.toString()) {
        instructions.push(this.getRevokeInstruction(ownerTokenAccount, owner));
      }
    }

    instructions.push(
      this.getApprovalInstruction(
        ownerTokenAccount,
        userPaymentPda,
        owner,
        approvalAmount
      )
    );

    return instructions;
  }

  /**
   * Gets the Payments Delegate PDA used for token delegation (legacy).
   * @deprecated Use UserPayment PDA as delegate instead. This is kept for backward compatibility.
   * @returns PdaResult containing the PDA address and bump
   */
  getPaymentsDelegatePda() {
    return getPaymentsDelegatePda(this.programId);
  }

  /**
   * Changes the status of a payment policy (active or paused).
   * Only the policy owner can change the status.
   * @param tokenMint - Public key of the token mint
   * @param policyId - ID of the policy to modify
   * @param newStatus - New status for the policy
   * @returns Transaction instruction to change the policy status
   */
  async changePaymentPolicyStatus(
    tokenMint: PublicKey,
    policyId: number,
    newStatus: { active: {} } | { paused: {} }
  ): Promise<TransactionInstruction> {
    const owner = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(
      owner,
      tokenMint
    );
    const { address: paymentPolicyPda } = this.getPaymentPolicyPda(
      userPaymentPda,
      policyId
    );
    const { address: configPda } = getConfigPda(this.programId);

    const accounts = {
      owner: owner,
      config: configPda,
      userPayment: userPaymentPda,
      tokenMint: tokenMint,
      paymentPolicy: paymentPolicyPda,
    };

    return await this.program.methods
      .changePaymentPolicyStatus(policyId, newStatus)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Deletes a payment policy permanently.
   * Only the policy owner can delete their policies.
   * @param tokenMint - Public key of the token mint
   * @param policyId - ID of the policy to delete
   * @returns Transaction instruction to delete the payment policy
   */
  async deletePaymentPolicy(
    tokenMint: PublicKey,
    policyId: number
  ): Promise<TransactionInstruction> {
    const owner = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(
      owner,
      tokenMint
    );
    const { address: paymentPolicyPda } = this.getPaymentPolicyPda(
      userPaymentPda,
      policyId
    );
    const { address: configPda } = getConfigPda(this.programId);

    const accounts = {
      owner: owner,
      config: configPda,
      userPayment: userPaymentPda,
      tokenMint: tokenMint,
      paymentPolicy: paymentPolicyPda,
      rentPayer: owner,
    };

    return await this.program.methods
      .deletePaymentPolicy(policyId)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Deletes a payment gateway.
   * Only the protocol admin can delete gateways.
   * @param gatewayAuthority - Public key of the gateway authority
   * @returns Transaction instruction to delete the payment gateway
   */
  async deletePaymentGateway(
    gatewayAuthority: PublicKey
  ): Promise<TransactionInstruction> {
    const admin = this.provider.publicKey;
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const { address: configPda } = getConfigPda(this.programId);

    const accounts = {
      admin: admin,
      authority: gatewayAuthority,
      gateway: gatewayPda,
      config: configPda,
    };

    return await this.program.methods
      .deletePaymentGateway()
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Changes the signer authorized to execute payments for a gateway.
   * Only the gateway authority can change the signer.
   * @param gatewayAuthority - Public key of the current gateway authority
   * @param newSigner - Public key of the new signer
   * @returns Transaction instruction to change the gateway signer
   */
  async changeGatewaySigner(
    gatewayAuthority: PublicKey,
    newSigner: PublicKey
  ): Promise<TransactionInstruction> {
    const authority = this.provider.publicKey;
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const { address: configPda } = getConfigPda(this.programId);

    const accounts = {
      authority: authority,
      config: configPda,
      gateway: gatewayPda,
      newSigner: newSigner,
    };

    return await this.program.methods
      .changeGatewaySigner()
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Changes the fee recipient for a payment gateway.
   * Only the gateway authority can change the fee recipient.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param newFeeRecipient - Public key of the new fee recipient
   * @returns Transaction instruction to change the gateway fee recipient
   */
  async changeGatewayFeeRecipient(
    gatewayAuthority: PublicKey,
    newFeeRecipient: PublicKey
  ): Promise<TransactionInstruction> {
    const authority = this.provider.publicKey;
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const { address: configPda } = getConfigPda(this.programId);

    const accounts = {
      authority: authority,
      config: configPda,
      gateway: gatewayPda,
      newFeeRecipient: newFeeRecipient,
    };

    return await this.program.methods
      .changeGatewayFeeRecipient()
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Changes the gateway fee in basis points for a payment gateway.
   * Only the gateway authority can change the fee.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param newFeeBps - New gateway fee in basis points (0-10000)
   * @returns Transaction instruction to change the gateway fee bps
   */
  async changeGatewayFeeBps(
    gatewayAuthority: PublicKey,
    newFeeBps: number
  ): Promise<TransactionInstruction> {
    const authority = this.provider.publicKey;
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const { address: configPda } = getConfigPda(this.programId);

    // Validate fee
    if (newFeeBps > 10000) {
      throw new Error("Gateway fee cannot exceed 10000 bps (100%)");
    }

    const accounts = {
      authority: authority,
      config: configPda,
      gateway: gatewayPda,
    };

    return await this.program.methods
      .changeGatewayFeeBps(newFeeBps)
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Updates the custom protocol fee settings for a payment gateway.
   * Only the protocol admin can modify these settings.
   * This allows setting a gateway-specific protocol fee that overrides the global default.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param useCustomProtocolFee - Whether to use custom protocol fee (true) or global default (false)
   * @param customProtocolFeeBps - Custom protocol fee in basis points (0-10000). Only used if useCustomProtocolFee is true.
   * @returns Transaction instruction to update gateway protocol fee settings
   */
  async updateGatewayProtocolFee(
    gatewayAuthority: PublicKey,
    useCustomProtocolFee: boolean,
    customProtocolFeeBps: number
  ): Promise<TransactionInstruction> {
    const admin = this.provider.publicKey;
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const { address: configPda } = getConfigPda(this.programId);

    // Validate fee
    if (customProtocolFeeBps > 10000) {
      throw new Error("Protocol fee cannot exceed 10000 bps (100%)");
    }

    const accounts = {
      admin: admin,
      authority: gatewayAuthority,
      gateway: gatewayPda,
      config: configPda,
    };

    return await this.program.methods
      .updateGatewayProtocolFee({
        useCustomProtocolFee,
        customProtocolFeeBps,
      })
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Sets the raw feature_flags byte on a gateway (authority-only).
   * Bit 2 (CUSTOM_PROTOCOL_FEE) is protected and cannot be changed here —
   * use updateGatewayCustomProtocolFee for that.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param featureFlags - Raw feature flags byte (only bits 0-1 are applied)
   * @returns Transaction instruction
   */
  async updateGatewayFeatureFlags(
    gatewayAuthority: PublicKey,
    featureFlags: number
  ): Promise<TransactionInstruction> {
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);

    const validMask = GATEWAY_FEATURES.REFERRAL | GATEWAY_FEATURES.NET_AMOUNT;
    if ((featureFlags & ~validMask) !== 0 && featureFlags !== 0) {
      throw new Error(
        "Invalid feature flags — only REFERRAL and NET_AMOUNT bits can be set via this method"
      );
    }

    const accounts = {
      authority: gatewayAuthority,
      gateway: gatewayPda,
    };

    return await this.program.methods
      .updateGatewayFeatureFlags({ featureFlags })
      .accountsStrict(accounts)
      .instruction();
  }

  /**
   * Enables a specific feature flag on a gateway.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param flag - One of GATEWAY_FEATURES values
   * @returns Transaction instruction
   */
  async enableGatewayFeature(
    gatewayAuthority: PublicKey,
    flag: number
  ): Promise<TransactionInstruction> {
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const gateway = await this.getPaymentGateway(gatewayPda);
    if (!gateway) throw new Error("Gateway not found");
    const newFlags = gateway.featureFlags | flag;
    return this.updateGatewayFeatureFlags(gatewayAuthority, newFlags);
  }

  /**
   * Disables a specific feature flag on a gateway.
   * @param gatewayAuthority - Public key of the gateway authority
   * @param flag - One of GATEWAY_FEATURES values
   * @returns Transaction instruction
   */
  async disableGatewayFeature(
    gatewayAuthority: PublicKey,
    flag: number
  ): Promise<TransactionInstruction> {
    const { address: gatewayPda } = this.getGatewayPda(gatewayAuthority);
    const gateway = await this.getPaymentGateway(gatewayPda);
    if (!gateway) throw new Error("Gateway not found");
    const newFlags = gateway.featureFlags & ~flag;
    return this.updateGatewayFeatureFlags(gatewayAuthority, newFlags);
  }

  // Query methods

  /**
   * Retrieves all payment gateways in the protocol.
   * @returns Array of payment gateway accounts with their public keys
   */
  async getAllPaymentGateway(): Promise<
    Array<{ publicKey: PublicKey; account: PaymentGateway }>
  > {
    return await this.program.account.paymentGateway.all();
  }

  /**
   * Retrieves all payment policies in the protocol.
   * @returns Array of payment policy accounts with their public keys
   */
  async getAllPaymentPolicies(): Promise<
    Array<{ publicKey: PublicKey; account: PaymentPolicy }>
  > {
    return await this.program.account.paymentPolicy.all([]);
  }

  /**
   * Retrieves all user payment accounts in the protocol.
   * @returns Array of user payment accounts with their public keys
   */
  async getAllUserPayments(): Promise<
    Array<{ publicKey: PublicKey; account: UserPayment }>
  > {
    return await this.program.account.userPayment.all([]);
  }

  /**
   * Retrieves all user payment accounts owned by a specific user.
   * @param owner - Public key of the user
   * @returns Array of user payment accounts owned by the specified user
   */
  async getAllUserPaymentsByOwner(
    owner: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: UserPayment }>> {
    return await this.program.account.userPayment.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: owner.toBase58(),
        },
      },
    ]);
  }

  /**
   * Retrieves all payment policies where the specified user is the payer.
   * @param user - Public key of the payment user
   * @returns Array of payment policies where the user is the payer
   * @deprecated Use getPaymentPoliciesByUserPayment instead!
   */
  async getPaymentPoliciesByUser(
    user: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.getPaymentPoliciesByUserPayment(user);
  }

  /**
   * Retrieves all payment policies where the specified user is the recipient.
   * @param user - Public key of the payment recipient
   * @returns Array of payment policies where the user is the recipient
   */
  async getPaymentPoliciesByRecipient(
    user: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.program.account.paymentPolicy.all([
      {
        memcmp: {
          offset: 8 + 32, // Skip discriminator
          bytes: user.toBase58(),
        },
      },
    ]);
  }

  /**
   * Retrieves all payment policies executed by the specified gateway.
   * @param gateway - Public key of the payment gateway
   * @returns Array of payment policies executed by the gateway
   */
  async getPaymentPoliciesByGateway(
    gateway: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.program.account.paymentPolicy.all([
      {
        memcmp: {
          offset: 8 + 32 + 32, // Skip discriminator + user_payment + recipient
          bytes: gateway.toBase58(),
        },
      },
    ]);
  }

  /**
   * Retrieves all payment policies belonging to the specified user payment account.
   * @param userPayment - Public key of the user payment PDA
   * @returns Array of payment policies for the user payment account
   */
  async getPaymentPoliciesByUserPayment(
    userPayment: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.program.account.paymentPolicy.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: userPayment.toBase58(),
        },
      },
    ]);
  }

  /**
   * Retrieves all payment policies belonging to the specified user payment account.
   * @param userPayment - Public key of the user payment PDA
   * @returns Array of payment policies for the user payment account
   */
  async getPaymentPoliciesByGatewayOwnerAndMint(
    walletPublicKey: PublicKey,
    tokenMint: PublicKey,
    gateway: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    const userPayment = this.getUserPaymentPda(
      walletPublicKey,
      tokenMint
    ).address;
    return await this.program.account.paymentPolicy.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: userPayment.toBase58(),
        },
      },
      {
        memcmp: {
          offset: 8 + 32 + 32, // Skip discriminator + user_payment + recipient
          bytes: gateway.toBase58(),
        },
      },
    ]);
  }

  /**
   * Fetches a specific user payment account by its address.
   * @param userPaymentAddress - Public key of the user payment account
   * @returns The user payment account data or null if not found
   */
  async getUserPayment(
    userPaymentAddress: PublicKey
  ): Promise<UserPayment | null> {
    return await this.program.account.userPayment.fetchNullable(
      userPaymentAddress
    );
  }

  /**
   * Fetches the program configuration account.
   * @param configAddress - Public key of the program config account
   * @returns The program configuration data or null if not found
   */
  async getProgramConfig(
    configAddress: PublicKey
  ): Promise<ProgramConfig | null> {
    return await this.program.account.programConfig.fetchNullable(
      configAddress
    );
  }

  /**
   * Fetches a specific payment gateway account by its address.
   * @param gatewayAddress - Public key of the payment gateway account
   * @returns The payment gateway account data or null if not found
   */
  async getPaymentGateway(
    gatewayAddress: PublicKey
  ): Promise<PaymentGateway | null> {
    return await this.program.account.paymentGateway.fetchNullable(
      gatewayAddress
    );
  }

  /**
   * Fetches a specific payment policy account by its address.
   * @param policyAddress - Public key of the payment policy account
   * @returns The payment policy account data or null if not found
   */
  async getPaymentPolicy(
    policyAddress: PublicKey
  ): Promise<PaymentPolicy | null> {
    return await this.program.account.paymentPolicy.fetchNullable(
      policyAddress
    );
  }

  /**
   * Fetches a specific referral account by the owner's public key and gateway.
   * This is a convenience method that finds the referral account for an owner within a specific gateway.
   * @param gateway - Public key of the gateway
   * @param owner - Public key of the referral account owner
   * @returns The referral account data or null if not found
   */
  async getReferralAccountByOwner(
    gateway: PublicKey,
    owner: PublicKey
  ): Promise<ReferralAccount | null> {
    const allReferrals = await this.program.account.referralAccount.all([
      {
        memcmp: {
          offset: 40, // Skip discriminator (8) + gateway (32)
          bytes: owner.toBase58(),
        },
      },
    ]);

    for (const ref of allReferrals) {
      const refData = await this.program.account.referralAccount.fetchNullable(
        ref.publicKey
      );
      if (refData && refData.gateway.toString() === gateway.toString()) {
        return refData;
      }
    }
    return null;
  }

  /**
   * Fetches a specific referral account by its address.
   * @param referralAccountAddress - Public key of the referral account
   * @returns The referral account data or null if not found
   */
  async getReferralAccount(
    referralAccountAddress: PublicKey
  ): Promise<ReferralAccount | null> {
    return await this.program.account.referralAccount.fetchNullable(
      referralAccountAddress
    );
  }

  /**
   * Builds the referral chain for a given user and gateway.
   * This method traverses the referral chain up to 3 levels deep.
   * We replace the default PublicKey by null here!
   * @param user - Public key of the user to find the referral chain for
   * @param gateway - Public key of the gateway
   * @returns Array of referral account addresses [L1, L2, L3] (may contain nulls)
   */
  async getReferralChain(
    user: PublicKey,
    gateway: PublicKey
  ): Promise<(PublicKey | null)[]> {
    const chain: (PublicKey | null)[] = [];

    // Get the user's referral account for this gateway
    const userReferral = await this.getReferralAccountByOwner(gateway, user);

    if (!userReferral) {
      // User doesn't have a referral account
      return [null, null, null];
    }

    // L1 referrer (who referred this user)
    if (userReferral.referrer.toString() != PublicKey.default.toString()) {
      chain.push(userReferral.referrer);

      // Get L1's referral account to find L2
      const l1Referral = await this.getReferralAccount(userReferral.referrer);

      if (
        l1Referral &&
        l1Referral.referrer.toString() != PublicKey.default.toString()
      ) {
        chain.push(l1Referral.referrer);

        // Get L2's referral account to find L3
        const l2Referral = await this.getReferralAccount(l1Referral.referrer);

        if (
          l2Referral &&
          l2Referral.referrer.toString() != PublicKey.default.toString()
        ) {
          chain.push(l2Referral.referrer);
        } else {
          chain.push(null);
        }
      } else {
        chain.push(null);
        chain.push(null);
      }
    } else {
      chain.push(null);
      chain.push(null);
      chain.push(null);
    }

    return chain;
  }

  async confirmTransactionWithStatus(
    signature: TransactionSignature,
    commitment: "processed" | "confirmed" | "finalized" = "confirmed",
    interval: number = 150, // ms
    timeout: number = 60000 // 60 seconds
  ): Promise<SignatureStatus> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const { value } = await this.connection.getSignatureStatus(signature);

      if (value === null) {
        // Transaction not found yet, wait and retry
        await sleep(interval);
        continue;
      }

      // Check if there's an error
      if (value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
      }

      // Check if we've reached the desired commitment level
      if (
        commitment === "processed" ||
        (commitment === "confirmed" &&
          value.confirmationStatus !== "processed") ||
        (commitment === "finalized" && value.confirmationStatus === "finalized")
      ) {
        return value;
      }

      await sleep(500);
    }

    throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
  }

  /**
   * Executes a one-time token transfer with protocol and gateway fee distribution.
   * The amount parameter is the GROSS amount - the total that leaves the user's wallet.
   * Fees are deducted from this amount: recipient gets (amount - gateway_fee - protocol_fee).
   *
   * @param tokenMint - Public key of the token mint
   * @param recipient - Public key of the payment recipient
   * @param gateway - Public key of the payment gateway account (PDA)
   * @param amount - GROSS amount to transfer (total leaving user's wallet, fees included)
   * @param memo - Memo string or 64-byte array to include with the payment
   * @param referralCode - Optional 6-character referral code for referral rewards
   * @returns Array of transaction instructions (ATA creation + transfer)
   */
  async transfer(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    amount: BN,
    memo: string | number[],
    referralCode?: string
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    const authority = this.provider.publicKey;

    const { address: configPda } = getConfigPda(this.programId);

    const fromAta = getAssociatedTokenAddressSync(tokenMint, authority);
    const toAta = getAssociatedTokenAddressSync(tokenMint, recipient);

    const gatewayAccount = await this.getPaymentGateway(gateway);
    if (!gatewayAccount) {
      throw new Error("Gateway not found");
    }
    const config = await this.getProgramConfig(configPda);
    if (!config) {
      throw new Error("Program config not found");
    }

    // Recipient ATA
    const recipientAccountInfo = await this.connection.getAccountInfo(toAta);
    if (!recipientAccountInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          authority,
          toAta,
          recipient,
          tokenMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Gateway fee account ATA
    const gatewayFeeAccount = getAssociatedTokenAddressSync(
      tokenMint,
      gatewayAccount.feeRecipient
    );
    const gatewayFeeInfo = await this.connection.getAccountInfo(
      gatewayFeeAccount
    );
    if (!gatewayFeeInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          authority,
          gatewayFeeAccount,
          gatewayAccount.feeRecipient,
          tokenMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Protocol fee account ATA
    const protocolFeeAccount = getAssociatedTokenAddressSync(
      tokenMint,
      config.feeRecipient
    );
    const protocolFeeInfo = await this.connection.getAccountInfo(
      protocolFeeAccount
    );
    if (!protocolFeeInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          authority,
          protocolFeeAccount,
          config.feeRecipient,
          tokenMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const memoBytes = typeof memo === "string" ? encodeMemo(memo, 64) : memo;
    if (memoBytes.length !== 64) {
      throw new Error("Memo must be exactly 64 bytes");
    }
    const memoArray = memoBytes as [number, ...number[]] & { length: 64 };

    const accounts = {
      authority,
      config: configPda,
      gateway,
      from: fromAta,
      mint: tokenMint,
      to: toAta,
      gatewayFeeAccount,
      protocolFeeAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    let transferIx = await this.program.methods
      .transfer(amount, memoArray)
      .accountsStrict(accounts)
      .instruction();

    // Build referral chain if referral code provided and referrals enabled
    if (
      referralCode &&
      gatewayAccount.featureFlags &&
      gatewayAccount.referralAllocationBps > 0
    ) {
      const referralEnabled =
        (gatewayAccount.featureFlags & GATEWAY_FEATURES.REFERRAL) !== 0;
      if (referralEnabled) {
        const referralChain = await this.getReferralChain(authority, gateway);
        const referralAccounts = referralChain.filter(
          (ref): ref is PublicKey => ref !== null
        );

        if (referralAccounts.length > 0) {
          const remainingAccounts = [];
          for (const referrer of referralAccounts) {
            remainingAccounts.push({
              pubkey: referrer,
              isWritable: true,
              isSigner: false,
            });
          }
          for (const referrer of referralAccounts) {
            const referrerAccount = await this.getReferralAccount(referrer);
            if (!referrerAccount) {
              throw new Error("Missing referral account for referrer");
            }
            remainingAccounts.push({
              pubkey: getAssociatedTokenAddressSync(
                tokenMint,
                referrerAccount.owner
              ),
              isWritable: true,
              isSigner: false,
            });
          }

          transferIx = await this.program.methods
            .transfer(amount, memoArray)
            .accountsStrict(accounts)
            .remainingAccounts(remainingAccounts)
            .instruction();
        }
      }
    }

    instructions.push(transferIx);
    return instructions;
  }
}

// Legacy export for backward compatibility
/**
 * @deprecated Use Tributary instead. This export is maintained for backward compatibility.
 */
export { Tributary as TributarySDK };
