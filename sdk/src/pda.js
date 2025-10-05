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
exports.getConfigPda = getConfigPda;
exports.getGatewayPda = getGatewayPda;
exports.getUserPaymentPda = getUserPaymentPda;
exports.getPaymentPolicyPda = getPaymentPolicyPda;
exports.getPaymentsDelegatePda = getPaymentsDelegatePda;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const constants_js_1 = require("./constants.js");
function getConfigPda(programId) {
    const [address, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_js_1.SEEDS.CONFIG)], programId);
    return { address, bump };
}
function getGatewayPda(gatewayAuthority, programId) {
    const [address, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_js_1.SEEDS.GATEWAY), gatewayAuthority.toBuffer()], programId);
    return { address, bump };
}
function getUserPaymentPda(user, tokenMint, programId) {
    const [address, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_js_1.SEEDS.USER_PAYMENT), user.toBuffer(), tokenMint.toBuffer()], programId);
    return { address, bump };
}
function getPaymentPolicyPda(userPayment, policyId, programId) {
    const [address, bump] = web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(constants_js_1.SEEDS.PAYMENT_POLICY),
        userPayment.toBuffer(),
        new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
    ], programId);
    return { address, bump };
}
function getPaymentsDelegatePda(programId) {
    const [address, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_js_1.SEEDS.PAYMENTS)], programId);
    return { address, bump };
}
