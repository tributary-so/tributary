export interface Config {
  rpcUrl: string;
  programId: string;
  usdcMint: string;
  gateway: string;
}

const config: Config = {
  rpcUrl:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com",
  programId:
    process.env.NEXT_PUBLIC_TRIBUTARY_PROGRAM_ID ||
    "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ",
  usdcMint:
    process.env.NEXT_PUBLIC_USDC_MINT ||
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  gateway:
    process.env.NEXT_PUBLIC_GATEWAY_ADDRESS ||
    "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
};

export default config;
