import { getTokenSymbol as gts } from "@tributary-so/sdk";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getTokenSymbol(connection: any, mintAddress: any) {
  if (mintAddress == "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") {
    return "USDC (devnet)";
  }
  return gts(connection, mintAddress);
}
