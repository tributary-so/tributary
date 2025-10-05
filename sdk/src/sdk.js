"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringPaymentsSDK = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const spl_token_1 = require("@solana/spl-token");
const pda_js_1 = require("./pda.js");
class RecurringPaymentsSDK {
    constructor(program, programId) {
        this.program = program;
        this.programId = programId;
    }
    async initialize(admin) {
        const { address: configPda } = (0, pda_js_1.getConfigPda)(this.programId);
        return await this.program.methods
            .initialize()
            .accounts({
            admin,
            config: configPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .instruction();
    }
    async createUserPayment(accounts) {
        const { address: userPaymentPda } = (0, pda_js_1.getUserPaymentPda)(accounts.owner, accounts.tokenMint, this.programId);
        return await this.program.methods
            .createUserPayment()
            .accounts({
            owner: accounts.owner,
            tokenAccount: accounts.tokenAccount,
            tokenMint: accounts.tokenMint,
            userPayment: accounts.userPayment || userPaymentPda,
            systemProgram: accounts.systemProgram || web3_js_1.SystemProgram.programId,
        })
            .instruction();
    }
    async createPaymentGateway(accounts, gatewayFeeBps) {
        return await this.program.methods
            .createPaymentGateway(gatewayFeeBps)
            .accounts({
            authority: accounts.authority,
            gateway: accounts.gateway,
            feeRecipient: accounts.feeRecipient,
            systemProgram: accounts.systemProgram || web3_js_1.SystemProgram.programId,
        })
            .instruction();
    }
    async createPaymentPolicy(accounts, policyId, policyType, paymentFrequency, memo, startTime) {
        return await this.program.methods
            .createPaymentPolicy(policyId, policyType, paymentFrequency, memo, startTime || null)
            .accounts({
            user: accounts.user,
            userPayment: accounts.userPayment,
            recipient: accounts.recipient,
            tokenMint: accounts.tokenMint,
            gateway: accounts.gateway,
            paymentPolicy: accounts.paymentPolicy,
            systemProgram: accounts.systemProgram || web3_js_1.SystemProgram.programId,
        })
            .instruction();
    }
    async executePayment(accounts) {
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
            tokenProgram: accounts.tokenProgram || spl_token_1.TOKEN_PROGRAM_ID,
        })
            .instruction();
    }
    // Helper methods to get PDAs
    getConfigPda() {
        return (0, pda_js_1.getConfigPda)(this.programId);
    }
    getGatewayPda(gatewayAuthority) {
        return (0, pda_js_1.getGatewayPda)(gatewayAuthority, this.programId);
    }
    getUserPaymentPda(user, tokenMint) {
        return (0, pda_js_1.getUserPaymentPda)(user, tokenMint, this.programId);
    }
    getPaymentPolicyPda(userPayment, policyId) {
        return (0, pda_js_1.getPaymentPolicyPda)(userPayment, policyId, this.programId);
    }
    getPaymentsDelegatePda() {
        return (0, pda_js_1.getPaymentsDelegatePda)(this.programId);
    }
    // Utility methods
    static createSubscriptionPolicy(amount, intervalSeconds, autoRenew = true, maxRenewals = null) {
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
    static createMemoBuffer(memo, size = 64) {
        const buffer = new Uint8Array(size).fill(0);
        Buffer.from(memo).copy(buffer);
        return Array.from(buffer);
    }
}
exports.RecurringPaymentsSDK = RecurringPaymentsSDK;
