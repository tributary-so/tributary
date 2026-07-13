# lighthouse-sdk-legacy (vendored)

This is the **official prebuilt bundle** of the Lighthouse TypeScript SDK,
checked into the repo on purpose because it is **not published to npm**.

- **Source:** https://github.com/Jac0xb/lighthouse/tree/main/clients/js
- **Artifact:** https://github.com/Jac0xb/lighthouse/blob/main/clients/js/lighthouse-sdk-legacy-2.0.1.tgz
- **Version:** 2.0.1 (`clients/js`, the legacy web3.js v1 / umi client)

## Why vendored?

The Lighthouse program (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`) is the
only entry in Tributary's `ALLOWED_VALIDATION_PROGRAMS`. Tributary stores the
serialized Lighthouse assertion _data_ in a `ValidationPda` and replays it via
CPI, so we depend on the official client's serialization for correctness rather
than hand-rolling byte layouts. Since upstream does not publish to npm, the
built `dist/` is committed here.

## Deps

The upstream `package.json` pins `@metaplex-foundation/umi@^0.9.1` and
`@solana/web3.js@1.91.7`. These were **deduped to the workspace versions**
(`umi@^1.4.1`, `web3.js@^1.98.4`) to avoid a broken second dependency graph.
The data serializers are pure functions and produce byte-for-byte identical
output under the newer umi.

## Usage

Consumed via the Tributary SDK facade at `packages/sdk/src/lighthouse.ts` — do
not import this package directly from application code.

```bash
$ pnpm install
$ pnpm run build
$ pnpm run publish
```
