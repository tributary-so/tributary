# Testing Infrastructure

This document describes the testing infrastructure for the Tributary API, including setup, structure, and best practices.

## Overview

The API uses **Jest** as the testing framework with **ts-jest** for TypeScript support and **supertest** for HTTP endpoint testing.

## Test Structure

```
src/__tests__/
├── fixtures/          # Test data and mock data factories
│   └── payment-events.ts
├── mocks/            # Mock implementations
│   ├── database-mock.ts
│   └── query-mocks.ts
├── utils/            # Test utilities and helpers
│   └── test-helpers.ts
├── setup.ts          # Jest setup file
├── onetime.service.test.ts    # Service layer tests
└── onetime.route.test.ts      # API route tests
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Test Coverage

Current coverage for the onetime endpoint:

- **Route Handler** (`routes/onetime.ts`): 93.75% statements, 90% branches, 100% functions
- **Service Layer** (`services/onetime.ts`): 100% coverage

## Test Categories

### 1. Service Layer Tests

Unit tests for business logic, isolated from database and HTTP layer.

**File**: `onetime.service.test.ts`

Tests:

- ✅ Single payment retrieval
- ✅ Multiple payments retrieval
- ✅ Empty results handling
- ✅ Recipient filtering
- ✅ Pagination (limit/offset)
- ✅ Special characters in tracking ID
- ✅ Unicode characters in tracking ID
- ✅ Long tracking IDs
- ✅ Database error handling
- ✅ Memo bytes to string conversion
- ✅ Combined options handling

### 2. API Route Tests

Integration tests for HTTP endpoints using supertest.

**File**: `onetime.route.test.ts`

Tests:

- ✅ Successful GET request with trackingId
- ✅ 404 for non-existent payments
- ✅ Query parameters (recipient, limit, offset)
- ✅ Multiple payments as array
- ✅ Single payment as object
- ✅ Service error handling
- ✅ Special characters in trackingId
- ✅ Numeric parameter conversion
- ✅ Undefined parameter handling
- ✅ Missing trackingId handling

## Mock Data System

### Fixtures

Test data is centralized in `fixtures/payment-events.ts`:

```typescript
import { mockPaymentEvents } from "./fixtures/payment-events";

// Single payment
mockPaymentEvents.singlePayment;

// Multiple payments
mockPaymentEvents.multiplePayments;

// Empty results
mockPaymentEvents.emptyResults;

// Pagination test data (25 items)
mockPaymentEvents.paginationTest;

// Special characters
mockPaymentEvents.specialCharacters;

// Unicode tracking ID
mockPaymentEvents.unicodeTrackingId;

// Long tracking ID
mockPaymentEvents.longTrackingId;
```

### Creating Custom Mock Events

```typescript
import { createMockPaymentEvent } from "./fixtures/payment-events";

const customEvent = createMockPaymentEvent("my_tracking_id", {
  slot: 123456789,
  data: {
    amount: 5000000,
    // ... other overrides
  },
});
```

### Mock Database

The `MockDatabase` class provides a controllable database mock:

```typescript
import { createMockDatabase } from "./mocks/database-mock";

const mockDb = createMockDatabase({
  shouldFail: false, // Simulate database failure
  errorMessage: "...", // Custom error message
  delay: 100, // Simulate latency (ms)
});

mockDb.setMockData("tracking_id", [event1, event2]);
```

### Query Function Mocks

Simplified mocks for database query functions:

```typescript
import {
  mockGetOneTimePaymentByTrackingId,
  mockDatabaseError,
} from "./mocks/query-mocks";

// Mock successful query
const mockQuery = mockGetOneTimePaymentByTrackingId([event1, event2]);

// Mock database error
const mockError = mockDatabaseError("Connection failed");
```

## Test Utilities

### Creating Mock Express Objects

```typescript
import { createMockRequest, createMockResponse } from "./utils/test-helpers";

const req = createMockRequest(
  { trackingId: "test123" }, // params
  { limit: "10", offset: "5" } // query
);

const { json, status } = createMockResponse();
```

### Asserting Responses

```typescript
import {
  assertSuccessResponse,
  assertErrorResponse,
} from "./utils/test-helpers";

// Success response
assertSuccessResponse(json, expectedData);

// Error response
assertErrorResponse(status, 404, "Payment not found");
```

## Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use clear, descriptive test names
- One assertion concept per test
- Clean up mocks in `beforeEach`

### 2. Mocking Strategy

- Mock at the boundaries (database, external services)
- Keep service logic tests isolated
- Use dependency injection for easier mocking
- Reset mocks between tests

### 3. Test Data

- Use factories for creating test data
- Keep fixtures realistic and complete
- Test edge cases (empty, null, special chars)
- Avoid test interdependencies

### 4. Coverage Goals

- **Service Layer**: 100% coverage
- **Route Handlers**: >90% coverage
- **Overall**: >80% coverage

### 5. What to Test

✅ **DO Test**:

- Happy path scenarios
- Error conditions
- Edge cases (empty, null, boundaries)
- Input validation
- Response format
- Pagination logic

❌ **DON'T Test**:

- Framework internals
- Third-party libraries
- Implementation details
- Trivial getters/setters

## Adding New Tests

### For a New Endpoint

1. Create fixture data in `fixtures/`
2. Write service layer tests in `[name].service.test.ts`
3. Write route tests in `[name].route.test.ts`
4. Update mock system if needed

### Example Test Structure

```typescript
describe("Feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Service Layer", () => {
    it("should handle success case", async () => {
      // Arrange
      const mock = jest.fn().mockResolvedValue(data);

      // Act
      const result = await service.method();

      // Assert
      expect(result).toBeDefined();
      expect(mock).toHaveBeenCalled();
    });

    it("should handle error case", async () => {
      // ...
    });
  });

  describe("API Route", () => {
    it("should return 200 for valid request", async () => {
      const response = await request(app).get("/endpoint").expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
```

## Continuous Integration

Tests are automatically run on:

- Pre-commit hooks (via lint-staged)
- Pull request creation
- Merge to main branch

## Debugging Tests

### Run Specific Test File

```bash
pnpm test onetime.service.test.ts
```

### Run Specific Test

```bash
pnpm test -t "should return payment details"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Troubleshooting

### Common Issues

1. **Jest doesn't find tests**

   - Check file naming: `*.test.ts`
   - Verify test directory is in `roots` config

2. **Mock not working**

   - Ensure mock is before the test
   - Check import path (use `../` not absolute)
   - Clear mocks in `beforeEach`

3. **TypeScript errors in tests**

   - Check `tsconfig.json` includes test files
   - Use `@ts-nocheck` if testing implementation details
   - Add missing type definitions

4. **Async test timeout**
   - Increase timeout: `jest.setTimeout(10000)`
   - Ensure async operations are awaited
   - Check for unhandled promise rejections

## Extending the Mock System

The mock system is designed to be extensible for other endpoints:

### Adding New Mock Events

```typescript
// In fixtures/[feature]-events.ts
export function createMock[Feature]Event(
  id: string,
  overrides?: Partial<TypedEvent<SomeEventType>>
): TypedEvent<SomeEventType> {
  return {
    // ... base event structure
    ...overrides,
  };
}
```

### Adding New Query Mocks

```typescript
// In mocks/query-mocks.ts
export const mockGet[Feature]By[Criteria] = (data: any[]) => {
  const mockFn = jest.fn() as jest.MockedFunction<any>;
  mockFn.mockResolvedValue(data);
  return mockFn;
};
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Express Testing Guide](https://expressjs.com/en/advanced/testing.html)
