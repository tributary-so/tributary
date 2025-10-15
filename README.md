# Tributary

Quick start guide for running the Tributary application.
Tributary - a river or stream that flows into a larget river or a lake

## Prerequisites

- Node.js 20.19+ or 22.12+
- pnpm 9.6.0+

## Setup & Run

```bash
gh repo clone xeroc/tributary
# or
git clone https://github.com/xeroc/tributary

cd tributary
pnpm install

cd sdk
pnpm build

cd ../sdk-react
pnpm build

cd ../app
pnpm run dev
```
