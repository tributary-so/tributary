import { API_BASE_URL } from "@/constants";
import { TributaryJWTPayload } from "@tributary-so/payments";
import { createRemoteJWKSet, jwtVerify } from "jose";

export async function decodeJwt(
  token: string
): Promise<TributaryJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      createRemoteJWKSet(new URL(`${API_BASE_URL}/.well-known/jwks.json`)),
      {
        issuer: "https://api.tributary.so",
        audience: "tributary-checkout",
      }
    );
    console.log(payload);
    return payload as unknown as TributaryJWTPayload;
  } catch {
    return null;
  }
}

export function formatFrequency(freq: string): string {
  const map: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };
  if (map[freq]) return map[freq];
  if (freq.startsWith("custom:")) return `Every ${freq.slice(7)} seconds`;
  return freq;
}

export function formatTimestamp(ts: number | null): string {
  if (ts === null) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
