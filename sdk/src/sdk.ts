import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getPaymentPolicyPda,
  getPaymentsDelegatePda,
} from "./pda.js";
import type {
  CreateUserPaymentAccounts,
  CreatePaymentGatewayAccounts,
  CreatePaymentPolicyAccounts,
  ExecutePaymentAccounts,
  PolicyType,
  PaymentFrequency,
} from "./types.js";
import IDL from "../../target/idl/recurring_payments.json";

export class RecurringPaymentsSDK {
  program: anchor.Program;
  programId: PublicKey;
  connection: Connection;
  provider: any;

  constructor(connection: Connection, programId: PublicKey) {
    this.connection = connection;
    this.programId = programId;
    this.provider = { connection };
    this.program = new anchor.Program(IDL as anchor.Idl, this.provider);
  }

  async updateWallet(wallet: any) {
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      preflightCommitment: "confirmed",
    });
    this.program = new anchor.Program(IDL as anchor.Idl, this.provider);
  }

  async initialize(admin: PublicKey): Promise<TransactionInstruction> {
    const { address: configPda } = getConfigPda(this.programId);

    return await this.program.methods
      .initialize()
      .accounts({
        admin,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async createUserPayment(
    accounts: CreateUserPaymentAccounts
  ): Promise<TransactionInstruction> {
    const { address: userPaymentPda } = getUserPaymentPda(
      accounts.owner,
      accounts.tokenMint,
      this.programId
    );

    return await this.program.methods
      .createUserPayment()
      .accounts({
        owner: accounts.owner,
        tokenAccount: accounts.tokenAccount,
        tokenMint: accounts.tokenMint,
        userPayment: accounts.userPayment || userPaymentPda,
        systemProgram: accounts.systemProgram || SystemProgram.programId,
      })
      .instruction();
  }

  async createPaymentGateway(
    accounts: CreatePaymentGatewayAccounts,
    gatewayFeeBps: number
  ): Promise<TransactionInstruction> {
    return await this.program.methods
      .createPaymentGateway(gatewayFeeBps)
      .accounts({
        authority: accounts.authority,
        gateway: accounts.gateway,
        feeRecipient: accounts.feeRecipient,
        systemProgram: accounts.systemProgram || SystemProgram.programId,
      })
      .instruction();
  }

  async createPaymentPolicy(
    accounts: CreatePaymentPolicyAccounts,
    policyId: number,
    policyType: PolicyType,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: anchor.BN | null
  ): Promise<TransactionInstruction> {
    return await this.program.methods
      .createPaymentPolicy(
        policyId,
        policyType,
        paymentFrequency,
        memo,
        startTime || null
      )
      .accounts({
        user: accounts.user,
        userPayment: accounts.userPayment,
        recipient: accounts.recipient,
        tokenMint: accounts.tokenMint,
        gateway: accounts.gateway,
        paymentPolicy: accounts.paymentPolicy,
        systemProgram: accounts.systemProgram || SystemProgram.programId,
      })
      .instruction();
  }

  async executePayment(
    accounts: ExecutePaymentAccounts
  ): Promise<TransactionInstruction> {
    return await this.program.methods
      .executePayment()
      .accounts({
        gatewayAuthority: accounts.gatewayAuthority,
        paymentsDelegate: accounts.paymentsDelegate,
        paymentPolicy: accounts.paymentPolicy,
        userPayment: accounts.userPayment,
        gateway: accounts.gateway,
        config: accounts.config,
        userTokenAccount: accounts.userTokenAccount,
        recipientTokenAccount: accounts.recipientTokenAccount,
        gatewayFeeAccount: accounts.gatewayFeeAccount,
        protocolFeeAccount: accounts.protocolFeeAccount,
        tokenProgram: accounts.tokenProgram || TOKEN_PROGRAM_ID,
      })
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

  // Utility methods
  static createSubscriptionPolicy(
    amount: anchor.BN,
    intervalSeconds: anchor.BN,
    autoRenew: boolean = true,
    maxRenewals: number | null = null
  ): PolicyType {
    return {
      subscription: {
        amount,
        intervalSeconds,
        autoRenew,
        maxRenewals,
        padding: Array(8).fill(new anchor.BN(0)),
      },
    };
  }

  static createMemoBuffer(memo: string, size: number = 64): number[] {
    const buffer = new Uint8Array(size).fill(0);
    Buffer.from(memo).copy(buffer);
    return Array.from(buffer);
  }
}
