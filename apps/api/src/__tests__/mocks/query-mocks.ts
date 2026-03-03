import { jest } from "@jest/globals";
import { TypedEvent } from "../../db/queries";
import { TributaryPaymentRecord } from "../../db/events";

export const mockGetOneTimePaymentByTrackingId = (
  events: TypedEvent<TributaryPaymentRecord>[]
) => {
  const mockFn = jest.fn() as jest.MockedFunction<any>;
  mockFn.mockResolvedValue(events);
  return mockFn;
};

export const mockGetDb = (mockDb: unknown) => {
  const mockFn = jest.fn() as jest.MockedFunction<any>;
  mockFn.mockReturnValue(mockDb);
  return mockFn;
};

export const mockDatabaseError = (errorMessage: string = "Database error") => {
  const mockFn = jest.fn() as jest.MockedFunction<any>;
  mockFn.mockRejectedValue(new Error(errorMessage));
  return mockFn;
};
