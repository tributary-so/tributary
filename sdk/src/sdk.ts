import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createApproveInstruction,
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
} from "./pda";
import type {
  PolicyType,
  PaymentFrequency,
  UserPayment,
  PaymentPolicy,
  PaymentGateway,
  ProgramConfig,
} from "./types.js";
import { computePaymentsPerYear } from "./utils";
import IDL from "../../target/idl/recurring_payments.json"; // with { type: "json" };
import { RecurringPayments } from "../../target/types/recurring_payments.js";

/**
 * Anchor Program type for the Recurring Payments smart contract.
 */
export type Program = anchor.Program<RecurringPayments>;

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
  program: anchor.Program<RecurringPayments>;
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
  constructor(connection: Connection, wallet: anchor.Wallet) {
    this.connection = connection;
    this.programId = new PublicKey(IDL.address);

    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      preflightCommitment: "confirmed",
    });
    this.program = new anchor.Program(IDL as RecurringPayments, this.provider);
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
    this.program = new anchor.Program(IDL as RecurringPayments, this.provider);
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
    tokenMint: PublicKey
  ): Promise<TransactionInstruction> {
    const owner = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(
      owner,
      tokenMint
    );
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      owner: owner,
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
   * Creates a payment policy defining the terms of a recurring payment.
   * Policies specify amount, frequency, recipient, and renewal conditions.
   * @param tokenMint - Public key of the token to be paid
   * @param recipient - Public key that receives the payments
   * @param gateway - Public key of the gateway that will execute payments
   * @param amount - Amount to pay per interval (in smallest token units)
   * @param autoRenew - Whether the subscription should auto-renew
   * @param maxRenewals - Maximum number of renewals allowed (null for unlimited)
   * @param paymentFrequency - How often payments should occur
   * @param memo - Memo bytes to include with payments (max 64 bytes)
   * @param startTime - When the first payment should occur (defaults to now)
   * @returns Transaction instruction to create the payment policy
   */
  async createPaymentPolicy(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    amount: BN,
    autoRenew: boolean,
    maxRenewals: number | null,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: BN | null
  ): Promise<TransactionInstruction> {
    const user = this.provider.publicKey;
    const { address: configPda } = getConfigPda(this.programId);
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.activePoliciesCount + 1;
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
   * Creates a payment policy for milestone-based payments.
   * Milestones define conditional payments released based on time or manual approval.
   * @param tokenMint - Public key of the token to be paid
   * @param recipient - Public key that receives the payments
   * @param gateway - Public key of the gateway that will execute payments
   * @param milestoneAmounts - Array of amounts for each milestone (up to 4)
   * @param milestoneTimestamps - Array of timestamps when each milestone is due
   * @param releaseCondition - How milestones are released: 0=time-based, 1=manual approval, 2=automatic
   * @param memo - Memo bytes to include with payments (max 64 bytes)
   * @returns Transaction instruction to create the milestone payment policy
   */
  async createMilestonePaymentPolicy(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    milestoneAmounts: BN[],
    milestoneTimestamps: BN[],
    releaseCondition: number,
    memo: number[]
  ): Promise<TransactionInstruction> {
    const user = this.provider.publicKey;
    const { address: configPda } = getConfigPda(this.programId);
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.activePoliciesCount + 1;
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
    if (releaseCondition < 0 || releaseCondition > 2) {
      throw new Error(
        "Release condition must be 0 (time-based), 1 (manual), or 2 (automatic)"
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
   * Creates a complete set of instructions for setting up a subscription.
   * This includes creating user payment account (if needed), payment policy,
   * token approval, and optionally executing the first payment.
   * If approvalAmount is not provided, it is calculated automatically as the sum of all existing subscriptions
   * plus the new one, using maxRenewals or defaulting to 1 year of payments per subscription.
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
   * @returns Array of transaction instructions for the complete subscription setup
   */
  async createSubscriptionInstruction(
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
    executeImmediately?: boolean
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

    // Determine policy ID
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.activePoliciesCount + 1;
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

    // Create payment policy instruction
    const paymentPolicyPda = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      user: user,
      config: configPda,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicyPda.address,
      systemProgram: SystemProgram.programId,
    };

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
      // Calculate total approval amount needed for all subscriptions
      let totalApprovalAmount = new BN(0);

      // Add existing subscriptions
      const existingPolicies = await this.getPaymentPoliciesByUserPayment(
        userPaymentPda
      );
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
        }
      }

      // Add new subscription (assuming it's a subscription for now)
      const newSubscriptionApproval = this.calculateSubscriptionApprovalAmount(
        amount,
        paymentFrequency,
        maxRenewals
      );
      totalApprovalAmount = totalApprovalAmount.add(newSubscriptionApproval);

      finalApprovalAmount = totalApprovalAmount;
    }

    // Set up approval if needed
    const paymentsDelegatePda = this.getPaymentsDelegatePda().address;
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
      } else if (currentDelegate !== paymentsDelegatePda.toString()) {
        needsApproval = true;
      } else if (currentDelegatedAmount !== finalApprovalAmount.toString()) {
        needsApproval = true;
      }
    } else {
      needsApproval = true;
    }

    if (needsApproval) {
      const approveIx = createApproveInstruction(
        ownerTokenAccount,
        paymentsDelegatePda,
        user,
        BigInt(finalApprovalAmount.toString()),
        [],
        TOKEN_PROGRAM_ID
      );
      instructions.push(approveIx);
    }

    if (executeImmediately) {
      const executePaymentIxs = await this.executePayment(
        paymentPolicyPda.address,
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
   * Executes a payment according to the specified payment policy.
   * Transfers tokens from user to recipient, deducts protocol and gateway fees.
   * Can be called by anyone, but typically called by the gateway authority.
   * @param paymentPolicyPda - Public key of the payment policy to execute
   * @param recipient - Public key of the payment recipient (optional if in policy)
   * @param tokenMint - Public key of the token mint (optional if in policy)
   * @param gateway - Public key of the payment gateway (optional if in policy)
   * @param user - Public key of the payment user (optional if in policy)
   * @returns Array of transaction instructions including ATA creation and payment execution
   */
  async executePayment(
    paymentPolicyPda: PublicKey,
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
    };
    instructions.push(
      await this.program.methods
        .executePayment()
        .accountsStrict(accounts)
        .instruction()
    );

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
   * Calculates the total approval amount needed for a milestone payment.
   * @param milestoneAmounts - Array of milestone amounts
   * @returns Total approval amount needed
   */
  private calculateMilestoneApprovalAmount(milestoneAmounts: BN[]): BN {
    return milestoneAmounts.reduce((sum, amount) => sum.add(amount), new BN(0));
  }

  /**
   * Gets the Payments Delegate PDA used for token delegation.
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
    return await this.program.account.paymentPolicy.all([
      {
        dataSize: 586,
      },
    ]);
  }

  /**
   * Retrieves all user payment accounts in the protocol.
   * @returns Array of user payment accounts with their public keys
   */
  async getAllUserPayments(): Promise<
    Array<{ publicKey: PublicKey; account: UserPayment }>
  > {
    return await this.program.account.userPayment.all([
      {
        dataSize: 382,
      },
    ]);
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
        dataSize: 382,
      },
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
   */
  async getPaymentPoliciesByUser(
    user: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.program.account.paymentPolicy.all([
      {
        dataSize: 586,
      },
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: user.toBase58(),
        },
      },
    ]);
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
        dataSize: 586,
      },
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
        dataSize: 586,
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
   * Retrieves all payment policies belonging to the specified user payment account.
   * @param userPayment - Public key of the user payment PDA
   * @returns Array of payment policies for the user payment account
   */
  async getPaymentPoliciesByUserPayment(
    userPayment: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.program.account.paymentPolicy.all([
      {
        dataSize: 586,
      },
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: userPayment.toBase58(),
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
}

// Legacy export for backward compatibility
/**
 * @deprecated Use Tributary instead. This export is maintained for backward compatibility.
 */
export { Tributary as RecurringPaymentsSDK };
