import { Connection, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchMetadata,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";

// Re-export types for backward compatibility
export interface Creator {
  address: PublicKey;
  verified: boolean;
  share: number;
}

export interface Collection {
  verified: boolean;
  key: PublicKey;
}

// Simplified metadata structure for easier consumption
export interface Metadata {
  mint: PublicKey;
  data: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
  };
  primarySaleHappened: boolean;
  isMutable: boolean;
  collection: Collection | null;
}

/**
 * Derives the metadata PDA for a given mint address
 */
export function getMetadataPDA(mint: PublicKey): PublicKey {
  const umi = createUmi("");
  const metadataPda = findMetadataPda(umi, {
    mint: publicKey(mint.toString()),
  });
  return new PublicKey(metadataPda[0]);
}

/**
 * Retrieves token metadata for a given mint address using the Metaplex Token Metadata program
 * @param connection - Solana RPC connection
 * @param mint - PublicKey of the token mint
 * @returns Promise<Metadata | null> - The metadata object or null if not found
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
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return null;
  }
}
