# Pull Payments

Direct pull payments: a gateway pulls tokens from the user's token account on a schedule, with fees routed at settlement.

## Overview

Tributary's original and simplest payment family. The user approves a
**delegate** (the UserPayment PDA) on their SPL token account; a permissionless
gateway signer then executes pulls that transfer directly from the user's
account to the recipient, deducting protocol and gateway fees inline. There is
no intermediate escrow, no swap, and no validation hook — just delegate, pull,
settle. This page frames when to choose a pull payment over a programmable one
and links out to the SDK, React, checkout, JWT, x402, and CLI integration
paths.

<!-- TODO scope (c):
  - Delegate → pull → settle diagram and one-paragraph narrative
  - Decision guidance: pull vs programmable (link to integration-guide/index.md)
  - Pointers to every integration path under this section
  - Source: `AGENTS.md` PaymentPolicy section, `programs/tributary/src/processor/execute_payment.rs`
-->
