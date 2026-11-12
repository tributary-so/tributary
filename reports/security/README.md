# Tributary — Security Reports

> Finding index for the Tributary program (`TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`).
> The authoritative checklist lives at `programs/tributary/security-checklist.md`;
> fix work is tracked in beans.

## Report index

| Wave | Date | Document | Findings |
|---|---|---|---|
| CF / M / S / H / C | ≤ 2026-07 | *(not filed — pinned as inline fix-note comments at the fix sites in `programs/tributary/src/`)* | CF-002, CF-005, CF-012, CF-016, M-02, S-2, H-1, C-1, C-02, L2, M1 … |
| SZ (Slot Zero Security) | 2026-11-08 | [2026-11-08-slot-zero-security-review.pdf](2026-11-08-slot-zero-security-review.pdf) | SZ-M-1..3 🟥, SZ-L-1..3 🟥, SZ-I-1 ⚪ — **first original-source report in this folder**; every Tributary claim re-verified against the code at `4b0a32e9` on 2026-11-12 before registration (see the checklist's Verification record) |

The 2026-11-08 report also covers **riprap, accord, synod and canon** — those
sections are program-local findings registered in the Accord repo
(`meta/security-reports/` there; wave IDs SR5-\*), not here.

## Master finding table (status as of 2026-11-12)

| ID | Severity | Title | Status |
|---|---|---|---|
| SZ-M-1 | 🟡 Medium | `auto_renew = false` + `max_renewals = None` subscription never completes — charged every period (7 live policies) | ✅ Fixed 2026-11-12 |
| SZ-M-2 | 🟡 Medium | Pre-funding the deterministic intermediate ATA / validation PDAs (~0.00065 SOL) permanently bricks a composable policy | 🟥 Open |
| SZ-M-3 | 🟡 Medium | Referral tiers storable unvalidated, referral flag flips without validation → payer debit beyond the documented fee bound | 🟥 Open |
| SZ-L-1 | 🟢 Low | Pre-ADR-0024 PayAsYouGo accounts mis-deserialize (borsh `None` = 1 byte, not 9) — 2 live policies + their UserPayments permanently bricked; needs migration | 🟥 Open |
| SZ-L-2 | 🟢 Low | UpTo composables creatable but never executable (`InvalidAmount` on every path) | 🟥 Open |
| SZ-L-3 | 🟢 Low | Composable path skims the referral pool but never distributes it — pool swept to recipient | 🟥 Open |
| SZ-I-1 | ⚪ Info | SECURITY.md (3-of-5 + 48h) vs on-chain reality (single admin key, 2-of-3 no timelock) | ⚠️ Notes |
