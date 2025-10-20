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
  ProgramConfig,
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
    authority: PublicKey,
    gatewayFeeBps: number,
    gatewayFeeRecipient: PublicKey
  ): Promise<TransactionInstruction> {
    const admin = this.provider.publicKey;
    const gateway = this.getGatewayPda(authority).address;
    const { address: configPda } = getConfigPda(this.programId);
    const accounts = {
      admin: admin,
      authority: authority,
      gateway: gateway,
      config: configPda,
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
    amount: anchor.BN,
    autoRenew: boolean,
    maxRenewals: number | null,
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
    const nextPaymentDue =
      startTime || new anchor.BN(Math.floor(Date.now() / 1000));
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
      paymentPolicy: paymentPolicy.address,
      systemProgram: SystemProgram.programId,
    };
    return await this.program.methods
      .createPaymentPolicy(policyId, policyType, memo)
      .accountsStrict(accounts)
      .instruction();
  }

  async createSubscriptionInstruction(
    tokenMint: PublicKey,
    recipient: PublicKey,
    gateway: PublicKey,
    amount: anchor.BN,
    autoRenew: boolean,
    maxRenewals: number | null,
    paymentFrequency: PaymentFrequency,
    memo: number[],
    startTime?: anchor.BN | null,
    approvalAmount?: anchor.BN,
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
    const nextPaymentDue =
      startTime || new anchor.BN(Math.floor(Date.now() / 1000));
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
    const accounts = {
      user: user,
      userPayment: userPaymentPda,
      recipient: recipient,
      tokenMint: tokenMint,
      gateway: gateway,
      paymentPolicy: paymentPolicyPda.address,
      systemProgram: SystemProgram.programId,
    };

    const createPaymentPolicyIx = await this.program.methods
      .createPaymentPolicy(policyId, policyType, memo)
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
      gatewayAuthority: authority,
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

    const accounts = {
      owner: owner,
      userPayment: userPaymentPda,
      tokenMint: tokenMint,
      paymentPolicy: paymentPolicyPda,
    };

    return await this.program.methods
      .changePaymentPolicyStatus(policyId, newStatus)
      .accountsStrict(accounts)
      .instruction();
  }

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

    const accounts = {
      owner: owner,
      userPayment: userPaymentPda,
      tokenMint: tokenMint,
      paymentPolicy: paymentPolicyPda,
    };

    return await this.program.methods
      .deletePaymentPolicy(policyId)
      .accountsStrict(accounts)
      .instruction();
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

  async getAllUserPayments(): Promise<
    Array<{ publicKey: PublicKey; account: UserPayment }>
  > {
    return await this.program.account.userPayment.all();
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

  async getUserPayment(
    userPaymentAddress: PublicKey
  ): Promise<UserPayment | null> {
    return await this.program.account.userPayment.fetchNullable(
      userPaymentAddress
    );
  }

  async getProgramConfig(
    configAddress: PublicKey
  ): Promise<ProgramConfig | null> {
    return await this.program.account.programConfig.fetchNullable(
      configAddress
    );
  }

  async getPaymentGateway(
    gatewayAddress: PublicKey
  ): Promise<PaymentGateway | null> {
    return await this.program.account.paymentGateway.fetchNullable(
      gatewayAddress
    );
  }

  async getPaymentPolicy(
    policyAddress: PublicKey
  ): Promise<PaymentPolicy | null> {
    return await this.program.account.paymentPolicy.fetchNullable(
      policyAddress
    );
  }
}
