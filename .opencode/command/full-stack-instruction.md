---
description: Implement a new feature from contract to SDK with comprehensive testing and documentation
agent: build
---

## Usage

/full-stack-instruction <new-feature>

new-feature = $ARGUMENTS

## Step 1: Research & Planning

Research $ARGUMENTS, then pick the most useful one, design it to be highly flexible through configurable parameters

### Research Phase

- Analyze current implementation patterns and existing features
- Use web search to understand market needs and competitor features
- Brainstorm 3-5 potential implementations considering Web2-to-Web3 migration value
- Evaluate based on developer adoption potential, user experience improvement, and technical feasibility

### Selection Phase

- Evaluate options using criteria: flexibility, adoption potential, Solana efficiency, backward compatibility
- Pick the most impactful feature that addresses clear user pain points
- Consider implementation complexity vs. user value ratio

### Design Phase

- Design with configurable parameters (amounts, frequencies, conditions, fees, limits)
- Ensure 128-byte alignment for Solana accounts (critical for Anchor programs)
- Include proper validation, error handling, and edge case coverage
- Design for composability with existing features

**Best Practices:**

- Start with user stories: "As a [user], I want [feature] so that [benefit]"
- Consider upgrade paths and backward compatibility
- Design for monitoring and analytics
- Include reasonable defaults for all parameters

## Step 2: Implement in Contract

Implement the contract in the Solana program with proper error handling and validation.

### Smart Contract Implementation

- Add new variant to PolicyType enum in `programs/recurring_payments/src/state/mod.rs`
- Ensure exact 128-byte sizing with proper padding
- Update execution logic in `programs/recurring_payments/src/instructions/execute_payment.rs`
- Add validation in `create_payment_policy.rs`
- Handle borrowing carefully (immutable then mutable borrows can cause compilation errors)

### Integration Requirements

- Integrate with existing PDA structures and account validation
- Maintain compatibility with current fee structures and gateway system
- Update event emissions for proper indexing
- Ensure atomic operations for fund safety

**Best Practices:**

- Use `require!` macros for input validation
- Handle all enum variants explicitly (non-exhaustive patterns cause errors)
- Test with `anchor build` frequently to catch compilation issues early
- Follow existing code patterns for consistency

### Build Verification

```bash
# Build and verify compilation
anchor build

# Generate IDL for SDK integration
anchor idl build
```

Make a break when you have reached end of this step to let the user verify implementation.
Ask the user to review the contract implementation proposal.
User may request continuation by typing "proceed" or "continue".

## Step 3: Implement in SDK

Integrate the new feature into the TypeScript SDK with comprehensive error handling.

### SDK Implementation

- Add new methods to `sdk/src/sdk.ts` with proper JSDoc documentation
- Update approval calculation logic to handle new payment types
- Add parameter validation and type safety
- Create helper functions in `sdk/src/utils.ts` for reusable logic
- Update imports and type definitions

### Type Safety & Validation

- Use TypeScript strict mode for all new code
- Add runtime validation for all parameters
- Handle BN.js big number operations correctly
- Ensure compatibility with existing wallet adapters

**Best Practices:**

- Document all parameters with JSDoc compatible format
- Add parameter validation with descriptive error messages
- Use existing utility functions for consistency
- Test SDK methods independently before integration

### SDK Testing

```bash
# Build SDK to check for TypeScript errors
cd sdk && pnpm run build

# Run SDK-specific tests if available
cd sdk && pnpm test
```

## Step 4: Comprehensive Testing

Write comprehensive Anchor tests covering all functionality, edge cases, and integration points.

### Test Coverage Requirements

- Happy path scenarios for new feature
- Edge cases: minimum/maximum values, boundary conditions
- Error conditions: invalid parameters, insufficient funds, timing issues
- Integration with existing features (gateways, fees, approvals)
- Multi-user scenarios and concurrent operations

### Test Structure

- Add tests to `tests/recurring_payments.test.ts`
- Follow existing test patterns and naming conventions
- Use proper setup/teardown for test isolation
- Test both success and failure scenarios
- these tests are integration tests and can only be run with `anchor test`!

**Best Practices:**

- Test with realistic token amounts and time intervals
- Include tests for approval mechanisms and delegation
- Verify event emissions and state changes
- Test integration with existing payment flows
- Reuse as many PDAs from the beforeAll() initialization as you can.
- do not create new userPaymentPdas - you won't need it.
- never EVER remove existing tests or initialization!

### Test Execution

```bash
# Run all tests
anchor test
```

## Step 5: Documentation

Update the MkDocs documentation with comprehensive guides and examples.

### Documentation Structure

- Update `docs/docs/smart-contract.md` with contract changes
- Enhance `docs/docs/sdks.md` with SDK examples
- Expand `docs/docs/quickstart/integration.md` with integration guide
- Create dedicated feature guide (e.g., `docs/docs/milestone-payments.md`)
- Update `docs/mkdocs.yml` navigation

### Documentation Best Practices

- Include code examples for all major use cases
- Document parameter validation and error conditions
- Provide migration guides for existing users
- Include best practices and anti-patterns

## Step 6: Quality Assurance & Pre-Release

### Code Quality Checks

```bash
# Run linting across all workspaces
pnpm run lint

# Type checking
cd sdk && pnpm run typecheck

# Format code
pnpm run lint:fix
```

### Integration Testing

- Test with devnet deployment
- Verify compatibility with existing dApps
- Performance testing with realistic loads
- Security review of new code paths

## Step 7: Additional Materials & Marketing

### Technical Documentation

- Extend `docs/gtm/project.md` with feature architecture and design decisions
- Update API reference documentation
- Create video tutorials or interactive examples

### Marketing Materials

- Create `./marketing/tweets-[new-feature].md` with engaging tweet threads
- Write blog posts explaining the feature's value proposition
- Create developer-focused content with code examples
- Prepare release announcements and changelog entries

### Community Engagement

- Post in Solana developer forums and Discord
- Create demo applications showcasing the feature
- Gather feedback from early adopters

## Step 8: Deployment Preparation

### Release Checklist

- [ ] All tests passing
- [ ] Documentation complete and reviewed
- [ ] Marketing materials ready
- [ ] Security audit completed (if applicable)
- [ ] Performance benchmarks met
- [ ] Backward compatibility verified

## Additional Requirements

### Beads Task Management

Always use beads for ALL task tracking throughout this entire process.

**Setup:**

```bash
beads_set_context({"workspace_root": "/path/to/project"})
beads_create({"title": "Implement [feature]", "issue_type": "epic"})
```

**Task Breakdown:**

- Create epic for the feature
- Break down into research, design, implementation, testing, documentation subtasks
- Link dependencies appropriately (blocks, parent-child relationships)
- Update status as work progresses

**Progress Tracking:**

```bash
beads_ready()                    # Find next work
beads_update(id, {status: "in_progress"})  # Start task
beads_close(id, {reason: "Done"})         # Complete task
beads_sync()                     # Sync to git
```

### Best Practices Summary

- **Start Small**: Implement minimal viable feature first
- **Test Early**: Write tests alongside implementation
- **Document Continuously**: Update docs as you build
- **Use Beads**: Track all work for accountability
- **Follow Patterns**: Maintain consistency with existing codebase
- **Validate Often**: Build and test frequently to catch issues early
- **Security First**: Validate all inputs and handle edge cases
- **Performance Matters**: Consider gas costs and execution efficiency

IMPORTANT! Throughout, use beads to track all work, create subtasks for each phase, and link dependencies appropriately.
