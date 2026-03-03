import { TypedEvent } from "../../db/queries";
import { TributaryPaymentRecord } from "../../db/events";

export interface MockDatabaseConfig {
  shouldFail?: boolean;
  errorMessage?: string;
  delay?: number;
}

export class MockDatabase {
  private config: MockDatabaseConfig;
  private mockData: Map<string, TypedEvent<TributaryPaymentRecord>[]> =
    new Map();

  constructor(config: MockDatabaseConfig = {}) {
    this.config = config;
  }

  setMockData(
    trackingId: string,
    events: TypedEvent<TributaryPaymentRecord>[]
  ): void {
    this.mockData.set(trackingId, events);
  }

  clearMockData(): void {
    this.mockData.clear();
  }

  async getOneTimePaymentByTrackingId(
    trackingId: string,
    options?: {
      recipient?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<TypedEvent<TributaryPaymentRecord>[]> {
    if (this.config.shouldFail) {
      throw new Error(this.config.errorMessage || "Database connection failed");
    }

    if (this.config.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delay));
    }

    let results = this.mockData.get(trackingId) || [];

    if (options?.recipient) {
      results = results.filter(
        (event) => event.data.gateway === options.recipient
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return results.slice(offset, offset + limit);
  }
}

export function createMockDatabase(config?: MockDatabaseConfig): MockDatabase {
  return new MockDatabase(config);
}
