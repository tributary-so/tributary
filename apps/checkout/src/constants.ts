/// <reference types="vite/client" />

export interface Config {
  rpcUrl: string;
  programId: string;
  usdcMint: string;
  gateway: string;
}

const config: Config = {
  rpcUrl:
    import.meta.env.VITE_SOLANA_API || "https://api.mainnet-beta.solana.com",
  programId:
    import.meta.env.VITE_TRIBUTARY_PROGRAM_ID ||
    "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ",
  usdcMint:
    import.meta.env.VITE_USDC_MINT ||
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  gateway:
    import.meta.env.VITE_GATEWAY_ADDRESS ||
    "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
};

export default config;
