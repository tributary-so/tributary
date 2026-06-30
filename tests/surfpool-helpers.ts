import { Connection, PublicKey } from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export { USDC_MINT, USDT_MINT, TOKEN_PROGRAM_ID };

export class SurfpoolHelper {
  constructor(private connection: Connection) {}

  private async rpc(method: string, params: unknown[]): Promise<any> {
    const response = await fetch(this.connection.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });
    const json = (await response.json()) as any;
    if (json.error) {
      throw new Error(
        `Surfpool cheatcode ${method} failed: ${JSON.stringify(json.error)}`
      );
    }
    return json.result;
  }

  async setTokenAccount(params: {
    owner: PublicKey;
    mint: PublicKey;
    amount: number;
    delegate?: PublicKey;
    delegatedAmount?: number;
    tokenProgram?: string;
  }): Promise<void> {
    const update: Record<string, unknown> = { amount: params.amount };
    if (params.delegate) {
      update.delegate = params.delegate.toBase58();
      update.delegatedAmount = params.delegatedAmount ?? params.amount;
    }
    await this.rpc("surfnet_setTokenAccount", [
      params.owner.toBase58(),
      params.mint.toBase58(),
      update,
      params.tokenProgram ?? TOKEN_PROGRAM_ID,
    ]);
  }

  async setAccount(params: {
    publicKey: PublicKey;
    lamports?: number;
    data?: string;
    owner?: string;
    executable?: boolean;
  }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (params.lamports !== undefined) update.lamports = params.lamports;
    if (params.data !== undefined) update.data = params.data;
    if (params.owner !== undefined) update.owner = params.owner;
    if (params.executable !== undefined) update.executable = params.executable;
    await this.rpc("surfnet_setAccount", [params.publicKey.toBase58(), update]);
  }

  async streamAccount(params: {
    publicKey: PublicKey;
    includeOwnedAccounts?: boolean;
  }): Promise<void> {
    await this.rpc("surfnet_streamAccount", [
      params.publicKey.toBase58(),
      { includeOwnedAccounts: params.includeOwnedAccounts ?? false },
    ]);
  }

  async resetAccount(params: {
    publicKey: PublicKey;
    includeOwnedAccounts?: boolean;
  }): Promise<void> {
    await this.rpc("surfnet_resetAccount", [
      params.publicKey.toBase58(),
      { includeOwnedAccounts: params.includeOwnedAccounts ?? false },
    ]);
  }

  async timeTravel(params: {
    absoluteSlot?: number;
    absoluteEpoch?: number;
    timestamp?: number;
  }): Promise<void> {
    const config: Record<string, number> = {};
    if (params.absoluteSlot !== undefined)
      config.absoluteSlot = params.absoluteSlot;
    if (params.absoluteEpoch !== undefined)
      config.absoluteEpoch = params.absoluteEpoch;
    if (params.timestamp !== undefined) config.timestamp = params.timestamp;
    await this.rpc("surfnet_timeTravel", [config]);
  }

  async pauseClock(): Promise<void> {
    await this.rpc("surfnet_pauseClock", []);
  }

  async resumeClock(): Promise<void> {
    await this.rpc("surfnet_resumeClock", []);
  }

  async resetNetwork(): Promise<void> {
    await this.rpc("surfnet_resetNetwork", []);
  }

  async registerIdl(idl: {
    address: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.rpc("surfnet_registerIdl", [idl]);
  }

  async isSurfpool(): Promise<boolean> {
    try {
      await this.rpc("surfnet_getStreamedAccounts", []);
      return true;
    } catch {
      return false;
    }
  }
}
