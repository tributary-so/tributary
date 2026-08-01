import { Connection, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchMetadata,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";

// Re-export types for backward compatibility

/**
 * Represents a creator of a token, including their address, verification status, and royalty share.
 */
export interface Creator {
  /** The public key of the creator */
  address: PublicKey;
  /** Whether this creator's signature is verified on the metadata */
  verified: boolean;
  /** The percentage share of royalties this creator receives (0-100) */
  share: number;
}

/**
 * Represents a collection that a token belongs to.
 */
export interface Collection {
  /** Whether the collection membership is verified */
  verified: boolean;
  /** The public key of the collection mint */
  key: PublicKey;
}

/**
 * Simplified metadata structure for token information.
 * Provides essential token metadata in a consistent format, derived from Metaplex Token Metadata.
 */
export interface Metadata {
  /** The public key of the token mint */
  mint: PublicKey;
  /** Core token data */
  data: {
    /** Token name */
    name: string;
    /** Token symbol/ticker */
    symbol: string;
    /** URI pointing to off-chain metadata (JSON) */
    uri: string;
    /** Seller fee basis points (royalty percentage * 100) */
    sellerFeeBasisPoints: number;
    /** Array of creators or null if none */
    creators: Creator[] | null;
  };
  /** Whether the primary sale has occurred (affects royalties) */
  primarySaleHappened: boolean;
  /** Whether the metadata can still be modified */
  isMutable: boolean;
  /** Collection information or null if not part of a collection */
  collection: Collection | null;
}

/**
 * Derives the Metaplex Token Metadata PDA for a given mint address.
 * This PDA stores the token's metadata account on-chain.
 * @param mint - The public key of the token mint
 * @returns The public key of the metadata PDA
 */
export function getMetadataPDA(mint: PublicKey): PublicKey {
  const umi = createUmi("");
  const metadataPda = findMetadataPda(umi, {
    mint: publicKey(mint.toString()),
  });
  return new PublicKey(metadataPda[0]);
}

/**
 * Retrieves token metadata for a given mint address using the Metaplex Token Metadata program.
 * Fetches on-chain metadata and converts it to a simplified format for easier consumption.
 * @param connection - Solana RPC connection to use for fetching
 * @param mint - Public key of the token mint to fetch metadata for
 * @returns Promise resolving to Metadata object or null if metadata not found or invalid
 */
export async function getTokenInfo(
  connection: Connection,
  mint: PublicKey
): Promise<Metadata | null> {
  try {
    // Create UMI instance with the connection
    const umi = createUmi(connection.rpcEndpoint);

    // Convert PublicKey to UMI PublicKey
    const mintKey = publicKey(mint.toString());

    // Fetch metadata using Metaplex library
    const metadata = await fetchMetadata(umi, mintKey);

    // Convert creators to our format - handle UMI Option type
    let creators: Creator[] | null = null;
    if (metadata.creators) {
      const creatorsValue = (metadata.creators as any).value;
      creators = creatorsValue.map((creator: any) => ({
        address: new PublicKey(creator.address),
        verified: creator.verified,
        share: creator.share,
      }));
    }

    // Convert collection to our format - handle UMI Option type
    let collectionData: Collection | null = null;
    if (metadata.collection) {
      const collectionValue = (metadata.collection as any).value;
      collectionData = {
        verified: collectionValue.verified,
        key: new PublicKey(collectionValue.key),
      };
    }

    // Return simplified metadata structure
    return {
      mint,
      data: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
        creators,
      },
      primarySaleHappened: metadata.primarySaleHappened,
      isMutable: metadata.isMutable,
      collection: collectionData,
    };
  } catch {
    return null;
  }
}
