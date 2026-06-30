---
# tributary-w2ha
title: 'Composable: SDK + CLI Support'
status: completed
type: task
priority: normal
created_at: 2026-06-10T18:44:20Z
updated_at: 2026-06-13T05:05:09Z
parent: tributary-msk8
blocked_by:
    - tributary-g91h
---

Phase 5 of composable implementation. TypeScript SDK and CLI.

- [ ] Add ComposablePolicy, ScheduleType, ForwardConfig, ValidationConfig, ByteRangeCheck types to SDK
- [ ] Add createComposablePolicy method
- [ ] Add executeComposable method (with remaining_accounts builder helpers)
- [ ] Add deleteComposablePolicy method
- [ ] Add changeComposableStatus method
- [ ] PDA derivation helper for composable_policy seeds
- [ ] CLI commands: create-composable, execute-composable, delete-composable, change-composable-status
- [ ] Verify: pnpm run build succeeds in sdk/

Files: sdk/src/

## Summary of Changes\n\nSDK and CLI support for composable operations completed.
