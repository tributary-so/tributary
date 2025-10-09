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
} from "./types.js";
import IDL from "../../target/idl/recurring_payments.json"; // with { type: "json" };
import { RecurringPayments } from "../../target/types/recurring_payments.js";

export class RecurringPaymentsSDK {
  program: anchor.Program<RecurringPayments>;
  programId: PublicKey;
  connection: Connection;
  provider: anchor.AnchorProvider;

  constructor(connection: Connection, wallet: anchor.Wallet) {
    this.connection = connection;
    this.programId = new PublicKey(IDL.address);

    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      preflightCommitment: "confirmed",
    });
    this.program = new anchor.Program(IDL as RecurringPayments, this.provider);
  }

  async updateWallet(wallet: any) {
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      preflightCommitment: "confirmed",
    });
    this.program = new anchor.Program(IDL as RecurringPayments, this.provider);
  }

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

  async createPaymentGateway(
    gatewayFeeBps: number,
    gatewayFeeRecipient: PublicKey
  ): Promise<TransactionInstruction> {
    const authority = this.provider.publicKey;
    const gateway = this.getGatewayPda(authority).address;
    const accounts = {
      authority: authority,
      gateway: gateway,
      feeRecipient: gatewayFeeRecipient,
      systemProgram: SystemProgram.programId,
    };
    return await this.program.methods
      .createPaymentGateway(gatewayFeeBps)
      .accountsStrict(accounts)
      .instruction();
  }

  async createPaymentPolicy(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    policyType: PolicyType,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: anchor.BN | null
  ): Promise<TransactionInstruction> {
    const user = this.provider.publicKey;
    const { address: userPaymentPda } = this.getUserPaymentPda(user, tokenMint);
    const userPayment: UserPayment | null =
      await this.program.account.userPayment.fetchNullable(userPaymentPda);
    let policyId: number = 1;
    if (userPayment) {
      policyId = userPayment.activePoliciesCount + 1;
    }
    const paymentPolicy = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const accounts = {
      user: user,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicy.address,
      systemProgram: SystemProgram.programId,
    };
    return await this.program.methods
      .createPaymentPolicy(
        policyId,
        policyType,
        paymentFrequency,
        memo,
        startTime || null
      )
      .accountsStrict(accounts)
      .instruction();
  }

  async createPaymentPolicyWithUser(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    policyType: PolicyType,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: anchor.BN | null,
    approvalAmount?: anchor.BN
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

    // Create payment policy instruction
    const paymentPolicy = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const accounts = {
      user: user,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicy.address,
      systemProgram: SystemProgram.programId,
    };

    const createPaymentPolicyIx = await this.program.methods
      .createPaymentPolicy(
        policyId,
        policyType,
        paymentFrequency,
        memo,
        startTime || null
      )
      .accountsStrict(accounts)
      .instruction();

    instructions.push(createPaymentPolicyIx);

    if (approvalAmount) {
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
        } else if (currentDelegatedAmount !== approvalAmount.toString()) {
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
          BigInt(approvalAmount.toString()),
          [],
          TOKEN_PROGRAM_ID
        );
        instructions.push(approveIx);
      }
    }

    return instructions;
  }

  async executePayment(
    paymentPolicyPda: PublicKey
  ): Promise<TransactionInstruction> {
    const paymentPolicy: PaymentPolicy =
      await this.program.account.paymentPolicy.fetch(paymentPolicyPda);
    const userPaymentPda = paymentPolicy.userPayment;
    const userPayment: UserPayment =
      await this.program.account.userPayment.fetch(userPaymentPda);

    const { address: configPda } = getConfigPda(this.programId);
    const config = await this.program.account.programConfig.fetch(configPda);
    const authority = this.provider.publicKey;
    const accounts = {
      gatewayAuthority: authority,
      paymentsDelegate: this.getPaymentsDelegatePda().address,
      paymentPolicy: paymentPolicyPda,
      userPayment: userPaymentPda,
      gateway: paymentPolicy.gateway,
      config: configPda,
      userTokenAccount: getAssociatedTokenAddressSync(
        userPayment.tokenMint,
        userPayment.owner
      ),
      recipientTokenAccount: getAssociatedTokenAddressSync(
        userPayment.tokenMint,
        paymentPolicy.recipient
      ),
      gatewayFeeAccount: getAssociatedTokenAddressSync(
        userPayment.tokenMint,
        paymentPolicy.gateway
      ),
      protocolFeeAccount: getAssociatedTokenAddressSync(
        userPayment.tokenMint,
        config.feeRecipient
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
    };
    return await this.program.methods
      .executePayment()
      .accountsStrict(accounts)
      .instruction();
  }

  // Helper methods to get PDAs
  getConfigPda() {
    return getConfigPda(this.programId);
  }

  getGatewayPda(gatewayAuthority: PublicKey) {
    return getGatewayPda(gatewayAuthority, this.programId);
  }

  getUserPaymentPda(user: PublicKey, tokenMint: PublicKey) {
    return getUserPaymentPda(user, tokenMint, this.programId);
  }

  getPaymentPolicyPda(userPayment: PublicKey, policyId: number) {
    return getPaymentPolicyPda(userPayment, policyId, this.programId);
  }

  getPaymentsDelegatePda() {
    return getPaymentsDelegatePda(this.programId);
  }

  // Query methods
  async getAllPaymentGateway(): Promise<
    Array<{ publicKey: PublicKey; account: PaymentGateway }>
  > {
    return await this.program.account.paymentGateway.all();
  }

  async getAllPaymentPolicies(): Promise<
    Array<{ publicKey: PublicKey; account: PaymentPolicy }>
  > {
    return await this.program.account.paymentPolicy.all();
  }

  async getPaymentPoliciesByUser(
    user: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    return await this.program.account.paymentPolicy.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: user.toBase58(),
        },
      },
    ]);
  }

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
}
