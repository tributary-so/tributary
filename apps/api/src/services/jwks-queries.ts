import { getDb } from "../db";
import { signingKeys } from "../db/schema";
import { desc } from "drizzle-orm";

export async function listSigningKeys() {
  const db = getDb();
  const rows = await db
    .select({
      kid: signingKeys.kid,
      algorithm: signingKeys.algorithm,
      isCurrent: signingKeys.isCurrent,
      createdAt: signingKeys.createdAt,
      expiresAt: signingKeys.expiresAt,
      rotatedAt: signingKeys.rotatedAt,
    })
    .from(signingKeys)
    .orderBy(desc(signingKeys.createdAt));
  return rows;
}
