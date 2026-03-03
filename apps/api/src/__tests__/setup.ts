import { beforeAll, afterAll, jest } from "@jest/globals";

beforeAll(() => {
  jest.setTimeout(10000);
});

afterAll(() => {
  jest.clearAllMocks();
});
