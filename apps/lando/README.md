# Lando - Agent Commerce on Solana

An agent-to-agent subscription platform built for the Colosseum hackathon. Lando enables service agents to register their offerings and customer agents to pay via Tributary SDK.

## Overview

Lando provides a subscription platform where:
- **Service agents** can register services and generate subscription URLs
- **Customer agents** can decode subscription URLs and pay via Tributary SDK
- All payments are processed on Solana blockchain

## URL Pattern

Subscription URLs follow this pattern:
```
https://lando.tributary.so/subscribe/[base64_encoded_data]
```

### Encoded Data Structure

The Base64-encoded data contains:
- `tokenMint` - Solana token mint address
- `recipient` - Payment recipient address
- `gateway` - Tributary gateway address
- `amount` - Payment amount
- `autoRenew` - Auto-renewal flag (boolean)
- `maxRenewals` - Maximum renewals (number or null)
- `paymentFrequency` - Payment frequency (daily/weekly/monthly/annually)
- `trackingId` - Unique tracking ID
- `lineItems` - Array of subscription line items

## Tech Stack

- **Vite** - Build tool
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Routing

## Getting Started

### Prerequisites

- Node.js 18+ installed
- pnpm or npm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Development

The dev server will start at `http://localhost:5173`

- Landing page: `/`
- Subscription page: `/subscribe/:data`

## Design System

Lando uses a dark, nerdy design with:
- **Dark theme** with deep forest green/black background
- **Green accents** inspired by Lando Calrissian's vest
- **Monospace fonts** for code and technical elements
- **Matrix-style** subtle background effects
- **Agent-friendly** technical aesthetic

### Color Palette

- Background: `#0a0f0a`
- Card: `#0d1a0d`
- Accent: `#22c55e` (green)
- Glow: `#4ade80` (bright green)
- Text: `#e8fce8` (light green-tinted)
- Muted: `#86a786`
- Border: `#1a3a1a`

## Pages

### Landing Page (`/`)

- Hero section with platform introduction
- How it works - service agent and customer agent flows
- URL pattern documentation
- Call to action for service registration

### Subscription Page (`/subscribe/:data`)

- Decodes Base64-encoded subscription data
- Displays subscription details (line items, amount, frequency)
- Shows recipient and payment information
- Generates custom Tributary SDK skill instructions
- Provides copy-friendly code snippets
- Step-by-step payment instructions

## Integration with Tributary

Lando uses Tributary SDK for subscription payments. Reference implementation:
- `packages/payments/src/core/session.ts` - Encoding/decoding logic

## Project Structure

```
lando/
├── src/
│   ├── components/
│   │   ├── Header.tsx       # Navigation header
│   │   ├── Landing.tsx     # Landing page
│   │   └── Subscribe.tsx    # Subscription decode page
│   ├── assets/              # Static assets
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # Entry point
│   ├── index.css            # Tailwind + custom styles
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
├── public/                  # Public assets
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Future Enhancements

- Service registration dashboard
- Subscription management interface
- Payment history tracking
- Webhook notifications for payments
- Agent authentication
- Multi-token support

## Hackathon Notes

- Built for Colosseum Hackathon 2025
- Agent ID: 193
- Claim Code: `0dfb738b-22cd-48d2-ac63-d997a978bbfb`
- Branch: `feature/lando`

## License

Proprietary - Tributary
