---
# tributary-j6in
title: REVIEW.md findings resolution
status: in-progress
type: milestone
priority: normal
created_at: 2026-07-06T15:41:23Z
updated_at: 2026-07-06T15:42:27Z
---

Resolve all findings from branch diff review (develop→main, 2026-07-06). 2 Critical, 2 High, 9 Medium, 8 Low findings across program, SDK, payments, and tests.


## Findings Breakdown

### Critical (2)
- S-1: Duplicate InsufficientBalance require! → tributary-yw8h
- SDK-1: generateUsageReport always zero → tributary-rov6

### High (2)
- S-2: skim_input_fees overflow check → tributary-3r52
- G-6: Hardcoded test keypairs → tributary-pe5r

### Medium (9)
- C-1: bps_mul doc comment → tributary-ka6t
- C-3: Dead return value → tributary-xpas
- T-1: instructions: any[] → tributary-l99n
- T-2: wallet: any → tributary-f08m
- T-3: wallet as any → tributary-ic3d
- X-1: jsonwebtoken deps → tributary-htv0
- X-4: BN precision loss → tributary-2ep6
- R-1: HeroUI hard dep → tributary-wmqx
- G-2/G-3/G-4: Missing tests → tributary-vwsp, tributary-56fp, tributary-bij9

### Low (8)
- S-3: MAX_BYTE_RANGE_CHECKS → tributary-nwps
- ST-1: padding1 comment → tributary-wkq4
- ST-2: SAFETY comment → tributary-p0zm
- X-2: console.log removal → tributary-1sv2
- R-2: Tailwind dedup → tributary-jek8
- P-1: onetime.ts stub → tributary-4gow
- P-2: baseApiUrl config → tributary-or6l
- G-5: Shared test helpers → tributary-bova
