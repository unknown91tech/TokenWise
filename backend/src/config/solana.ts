
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class SolanaConfig {
  private static instance: SolanaConfig;
  private connection: Connection;
  private wsConnection: Connection;
  public readonly targetTokenAddress: PublicKey;

  private constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const wsUrl = process.env.SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com';

    // Initialize RPC connection
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
    });

    // Initialize WebSocket connection - use HTTP URL for WebSocket connection too
    // The Solana Connection class handles WebSocket internally
    this.wsConnection = new Connection(rpcUrl, {
      commitment: 'confirmed',
    });

    // Target token address
    this.targetTokenAddress = new PublicKey(
      process.env.TARGET_TOKEN_ADDRESS || '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump'
    );
  }

  public static getInstance(): SolanaConfig {
    if (!SolanaConfig.instance) {
      SolanaConfig.instance = new SolanaConfig();
    }
    return SolanaConfig.instance;
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public getWsConnection(): Connection {
    return this.wsConnection;
  }

  public getTokenProgramId(): PublicKey {
    return TOKEN_PROGRAM_ID;
  }

  public async getConnectionHealth(): Promise<boolean> {
    try {
      // Use getVersion() instead of getHealth() as it's more reliable
      const version = await this.connection.getVersion();
      return version && typeof version === 'object' && 'solana-core' in version;
    } catch (error) {
      console.error('Connection health check failed:', error);
      return false;
    }
  }

  public async getSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  public async getBlockTime(slot: number): Promise<number | null> {
    return await this.connection.getBlockTime(slot);
  }

  public async testConnection(): Promise<boolean> {
    try {
      // Test connection by getting the latest slot
      const slot = await this.connection.getSlot();
      return typeof slot === 'number' && slot > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const solanaConfig = SolanaConfig.getInstance();