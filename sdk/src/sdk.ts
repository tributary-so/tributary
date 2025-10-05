import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
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
  PolicyType,
  PaymentFrequency,
  UserPayment,
  PaymentPolicy,
} from "./types.js";
import IDL from "../../target/idl/recurring_payments.json" with { type: "json" };
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
    const userPayment: UserPayment =
      await this.program.account.userPayment.fetch(userPaymentPda);
    const policyId: number = userPayment.activePoliciesCount + 1;
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

  async executePayment(
    userPaymentPda: PublicKey
  ): Promise<TransactionInstruction> {
    const authority = this.provider.publicKey;
    const userPayment: UserPayment =
      await this.program.account.userPayment.fetch(userPaymentPda);
    const policyId: number = userPayment.activePoliciesCount + 1;
    const paymentPolicyPda = this.getPaymentPolicyPda(userPaymentPda, policyId);
    const paymentPolicy: PaymentPolicy =
      await this.program.account.paymentPolicy.fetch(paymentPolicyPda.address);
    const { address: configPda } = getConfigPda(this.programId);
    const config = await this.program.account.programConfig.fetch(configPda);
    const accounts = {
      gatewayAuthority: authority,
      paymentsDelegate: this.getPaymentsDelegatePda().address,
      paymentPolicy: paymentPolicyPda.address,
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
