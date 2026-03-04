import { Request } from "express";
import { jest, expect } from "@jest/globals";

export function createMockRequest(
  params: Record<string, string> = {},
  query: Record<string, string | undefined> = {}
): Partial<Request> {
  return {
    params,
    query,
  };
}

export function createMockResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  return {
    json,
    status,
  };
}

export function assertSuccessResponse(
  json: jest.Mock,
  expectedData: unknown
): void {
  expect(json).toHaveBeenCalled();
  const response = json.mock.calls[0][0] as {
    success: boolean;
    data: unknown;
    timestamp: number;
  };
  expect(response.success).toBe(true);
  expect(response.data).toEqual(expectedData);
  expect(response.timestamp).toBeDefined();
}

export function assertErrorResponse(
  status: jest.Mock,
  expectedStatus: number,
  expectedMessage?: string
): void {
  expect(status).toHaveBeenCalledWith(expectedStatus);
  const jsonResponse = status.mock.results[0].value as { json: jest.Mock };
  if (expectedMessage) {
    expect(jsonResponse.json).toHaveBeenCalled();
    const response = jsonResponse.json.mock.calls[0][0] as {
      success: boolean;
      error: string;
    };
    expect(response.success).toBe(false);
    expect(response.error).toContain(expectedMessage);
  }
}
