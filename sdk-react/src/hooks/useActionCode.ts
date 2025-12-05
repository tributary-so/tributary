import { useRef, useState, useCallback } from "react";
import ActionCodesClient, { Environment } from "@actioncodes/sdk";
import { useEffect } from "react";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { BN, Wallet } from "@coral-xyz/anchor";
import { Tributary } from "@tributary-so/sdk";
import { useConnection } from "@solana/wallet-adapter-react";
import { createPaymentFrequency } from "./useCreateSubscription";
import { CreateSubscriptionParams } from "../types";
import { createMemoBuffer } from "@tributary-so/sdk";

export const useActionCode = () => {
  const clientRef = useRef<ActionCodesClient | null>(null);
  const sdkRef = useRef<Tributary | null>(null);
  const actionCodeRef = useRef<string | null>(null);
  const resolvedPubkeyRef = useRef<PublicKey | null>(null);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [resolvedPubkey, setResolvedPubkey] = useState<PublicKey | null>(null);
  const { connection } = useConnection();

  // Helper function to create SDK if needed
  const ensureSDK = useCallback(
    (pubkey: PublicKey) => {
      if (sdkRef.current) {
        return sdkRef.current;
      }

      const w: Wallet = {
        payer: new Keypair({
          publicKey: pubkey.toBuffer(),
          secretKey: new Uint8Array(32),
        }),
        publicKey: pubkey,
        signTransaction: (tx) => tx as any,
        signAllTransactions: () => Promise.resolve([]),
      };

      sdkRef.current = new Tributary(connection, w);
      return sdkRef.current;
    },
    [connection]
  );

  useEffect(() => {
    if (clientRef.current) return;

    let environment = Environment("production");

    if (connection.rpcEndpoint.includes("devnet")) {
      environment = Environment("development");
    }

    // Safely get API key - works in all build formats (ESM, CJS, IIFE)
    const getApiKey = () => {
      try {
        // Try import.meta.env (Vite/ESM)
        if (typeof import.meta !== "undefined" && import.meta.env) {
          return import.meta.env.VITE_ACP_API_KEY;
        }
      } catch {
        // Fallback for IIFE builds
      }
      // Fallback: try process.env (Node.js/CJS) or return undefined
      if (typeof process !== "undefined" && process.env) {
        return (
          process.env.VITE_ACP_API_KEY || process.env.NEXT_PUBLIC_ACP_API_KEY
        );
      }
      return undefined;
    };

    const apiKey = getApiKey() ?? "kfTLXFBGzWdqhqZVKD5P0EBJbWoAXlAEfhZguphX9aI";

    clientRef.current = new ActionCodesClient(environment, {
      adapters: {
        solana: {
          connection,
        },
      },
      auth: { authorization: `Bearer ${apiKey}` },
    });
  }, [connection]);

  const resolveActionCode = useCallback(
    async (code: string) => {
      try {
        // Store the action code in both ref (for immediate access) and state (for reactivity)
        actionCodeRef.current = code;
        setActionCode(code);
        resolvedPubkeyRef.current = null; // Clear previous pubkey
        setResolvedPubkey(null);

        if (!clientRef.current) {
          throw new Error("ActionCodesClient not initialized");
        }

        const result = await clientRef.current.relay.resolve("solana", code);

        // Check if result exists and has pubkey
        if (!result) {
          console.error("Result is null or undefined");
          actionCodeRef.current = null;
          resolvedPubkeyRef.current = null;
          setActionCode(null);
          setResolvedPubkey(null);
          return {
            success: false,
            error: "No result from action code resolution",
          };
        }

        const pubkeyValue = result.pubkey;
        if (!pubkeyValue) {
          console.error(
            "No pubkey in result. Result structure:",
            JSON.stringify(result, null, 2)
          );
          actionCodeRef.current = null;
          resolvedPubkeyRef.current = null;
          setActionCode(null);
          setResolvedPubkey(null);
          return {
            success: false,
            error: "Invalid action code - no pubkey found",
          };
        }

        // Try to create PublicKey from the pubkey value
        let pubkey: PublicKey;
        try {
          pubkey = new PublicKey(pubkeyValue);
        } catch (pubkeyError) {
          console.error("Invalid pubkey format:", pubkeyValue, pubkeyError);
          actionCodeRef.current = null;
          resolvedPubkeyRef.current = null;
          setActionCode(null);
          setResolvedPubkey(null);
          return {
            success: false,
            error: `Invalid pubkey format: ${pubkeyValue}`,
          };
        }

        // Success - store everything in both ref (for immediate access) and state (for reactivity)
        resolvedPubkeyRef.current = pubkey;
        setResolvedPubkey(pubkey);
        actionCodeRef.current = code;
        setActionCode(code);

        // Create SDK with the resolved pubkey
        ensureSDK(pubkey);

        return { success: true, pubkey };
      } catch (error) {
        // Clear state on error
        actionCodeRef.current = null;
        resolvedPubkeyRef.current = null;
        setActionCode(null);
        setResolvedPubkey(null);
        console.error("Error resolving action code:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [ensureSDK]
  );

  const clearActionCode = useCallback(() => {
    actionCodeRef.current = null;
    resolvedPubkeyRef.current = null;
    sdkRef.current = null; // Clear SDK when clearing action code
    setActionCode(null);
    setResolvedPubkey(null);
  }, []);

  const submitTransaction = useCallback(
    async (
      params: Omit<CreateSubscriptionParams, "recipient">
    ): Promise<{ txSig: string }> => {
      // Use refs to ensure we have the latest values synchronously
      const currentActionCode = actionCodeRef.current;
      const currentResolvedPubkey = resolvedPubkeyRef.current;

      if (!currentResolvedPubkey || !currentActionCode) {
        throw new Error(
          `Action code not resolved. ActionCode (ref): ${currentActionCode}, ActionCode (state): ${actionCode}, Pubkey (ref): ${
            currentResolvedPubkey?.toString() || "null"
          }, Pubkey (state): ${resolvedPubkey?.toString() || "null"}`
        );
      }

      // Ensure SDK is created (lazy initialization)
      const sdk = ensureSDK(currentResolvedPubkey);
      if (!sdk) {
        throw new Error("Failed to create SDK");
      }

      try {
        // Convert simplified params to SDK format
        const frequency = createPaymentFrequency(
          params.interval,
          params.custom_interval
        );
        const memoBuffer = createMemoBuffer(params.memo || "", 64);
        const startTime = params.startTime
          ? new BN(Math.floor(params.startTime.getTime() / 1000))
          : null;

        // Get instructions
        const instructions = await sdk.createSubscriptionInstruction(
          params.token,
          currentResolvedPubkey, // Use resolved pubkey from action code
          params.gateway,
          params.amount,
          false,
          null,
          frequency,
          memoBuffer,
          startTime,
          params.approvalAmount,
          params.executeImmediately ?? true
        );

        const { blockhash } = await connection.getLatestBlockhash();
        const messageV0 = new TransactionMessage({
          payerKey: resolvedPubkeyRef.current!,
          recentBlockhash: blockhash,
          instructions: instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        const serialized = transaction.serialize();

        await clientRef.current?.relay.consume({
          chain: "solana",
          code: currentActionCode,
          payload: {
            mode: "sign-and-execute-transaction",
            transaction: Buffer.from(serialized).toString("base64"),
          },
        });

        let txSig = null;

        for await (const state of clientRef?.current!.relay.observe(
          "solana",
          currentActionCode
        )) {
          if (state.type === "finalized-execution") {
            txSig = state.txHash;
            break;
          }
        }

        if (!txSig) {
          throw new Error("Transaction not found");
        }

        return { txSig };
      } catch (error) {
        console.error("Error preparing transaction:", error);
        throw error;
      }
    },
    [connection, ensureSDK]
  );

  return {
    actionCode,
    resolvedPubkey,
    resolveActionCode,
    clearActionCode,
    submitTransaction,
  };
};
