# Tributary Checkout

Hosted checkout page for Tributary recurring payments. Create shareable checkout links for subscriptions and one-time payments on Solana—no backend required.

## Key Features

- **Zero-Backend Checkout**: Generate checkout URLs with all payment data embedded—no server needed
- **Subscription Support**: Recurring payments with flexible scheduling (weekly, monthly, yearly)
- **One-Time Payments**: Simple pay-per-use checkout flows (direct SPL transfer)
- **Policy Variants**: Milestone, pay-as-you-go, one-time policy, and UpTo authorization forms under `/policy/`
- **Direct Payments**: Simple pay-per-use checkout flows (immediate SPL transfer, no policy)
- **Non-Custodial**: Funds stay in user wallets with secure delegation-based automation
- **Multi-Token Support**: Configurable token mint (defaults to USDC on Solana)
- **Custom Redirects**: Success and cancel URLs for post-payment flows
- **Order Management**: Line items for detailed checkout summaries
- **Wallet Integration**: Seamless Solana wallet connection and transaction signing
- **Responsive Design**: Works beautifully on desktop and mobile

## Tech Stack

- **Language**: TypeScript
- **Framework**: React 19.1+ with Vite 6.0+
- **Styling**: Tailwind CSS 4.1+ with Radix UI themes
- **Blockchain**: Solana Web3.js 1.98+ + Wallet Adapter
- **Animations**: Framer Motion 12.30+
- **State Management**: TanStack React Query
- **Notifications**: Sonner toast notifications
- **Build Tool**: Vite with TypeScript

## Prerequisites

- Node.js 20.19+ or 22.12+
- pnpm 9.6.0+ (recommended) or npm
- A Solana wallet (Phantom, Backpack, Solflare, etc.)
- Tributary SDK packages (workspace dependencies)

## Getting Started

### 1. Navigate to Checkout App

```bash
cd apps/checkout
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create or update `.env` file in the checkout directory:

```bash
# Required for development
VITE_SOLANA_API=https://api.mainnet-beta.solana.com
VITE_TRIBUTARY_PROGRAM_ID=TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
VITE_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
VITE_GATEWAY_ADDRESS=6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4
```

| Variable                    | Description                 | Default                                        |
| --------------------------- | --------------------------- | ---------------------------------------------- |
| `VITE_SOLANA_API`           | Solana RPC endpoint         | `https://api.mainnet-beta.solana.com`          |
| `VITE_TRIBUTARY_PROGRAM_ID` | Tributary program ID        | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`  |
| `VITE_USDC_MINT`            | Default token mint          | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `VITE_GATEWAY_ADDRESS`      | Tributary gateway authority | `6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4` |

### 4. Start Development Server

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Architecture

### Directory Structure

```
apps/checkout/
├── src/
│   ├── components/           # React components
│   │   ├── checkout-form.tsx       # Subscription checkout form
│   │   ├── checkout-link-form.tsx  # Link generator (landing page)
│   │   ├── order-summary.tsx       # Payment summary display
│   │   ├── pay-form.tsx           # One-time payment form
│   │   ├── hero.tsx              # Hero section component
│   │   ├── solana-provider.tsx    # Wallet adapter provider
│   │   └── ui/                   # Radix UI components
│   ├── lib/
│   │   ├── tributary.ts          # Tributary SDK wrapper
│   │   └── utils.ts             # Utility functions
│   ├── app.tsx                 # Main app with routing
│   ├── landing.tsx              # Landing page
│   ├── pay-page.tsx            # Checkout payment page
│   ├── main.tsx                # Application entry point
│   ├── constants.ts            # App configuration
│   └── index.css              # Global styles
├── public/                     # Static assets
├── index.html                 # HTML entry point
├── package.json               # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite build config
├── tailwind.config.js        # Tailwind configuration
└── components.json           # shadcn/ui config
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Main App (app.tsx)                  │
│  HashRouter + Routes: /, /subscribe/*, /pay/*, /policy/*   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Landing Page        Pay Page (/pay)      Subscribe Page
   (landing.tsx)      (pay-page.tsx)       (/subscribe)
        │                     │                     │
        ▼                     ▼                     ▼
   CheckoutLinkForm     PayForm              CheckoutForm
   (Generate URL)       (One-time)           (Subscription)
                                                  │
                                                  ▼
                                       Tributary SDK Wrapper
                                       (@/lib/tributary.ts)
                                                  │
                                                  ▼
                                        Tributary Core SDK
                                        (@tributary-so/sdk)
                                                  │
                                                  ▼
                                        Solana Web3.js
                                        (on-chain program)
```

### Data Flow

**Checkout Link Generation Flow:**

```
User fills form → CheckoutLinkForm validates input
    ↓
CheckoutSessionManager.encodeSubscriptionUrl()
    ↓
Base64-encoded URL with all payment parameters
    ↓
Shareable checkout link generated
```

**Subscription Creation Flow:**

```
User clicks subscribe → Wallet connection
    ↓
CheckoutForm collects data → tributary.ts wrapper
    ↓
createSubscription() → Tributary SDK
    ↓
Instructions created + Transaction built
    ↓
User signs transaction in wallet
    ↓
Transaction sent to Solana
    ↓
UserPayment PDA created (or reused)
    ↓
PaymentPolicy PDA created
    ↓
PaymentsDelegate PDA created (delegation)
    ↓
Success state → Optional redirect
```

**One-Time Payment Flow:**

```
User clicks pay → Wallet connection
    ↓
PayForm collects data → tributary.ts wrapper
    ↓
createOneTimePayment() → Tributary SDK
    ↓
SPL token transfer instruction
    ↓
User signs transaction in wallet
    ↓
Transaction sent to Solana
    ↓
Success state → Optional redirect
```

### Key Components

**Landing Page (`landing.tsx`)**

- Hero section with call-to-action
- Feature highlights (Instant Setup, Secure by Design, Share Anywhere)
- How It Works section (3-step process)
- Benefits grid
- CheckoutLinkForm component for link generation

**Checkout Forms**

| Component           | Purpose                                  | Route          |
| ------------------- | ---------------------------------------- | -------------- |
| `CheckoutLinkForm`  | Generate shareable checkout URLs (all 6) | `/`            |
| `PayForm`           | Direct-transfer one-time checkout        | `/pay/*`       |
| `CheckoutForm`      | Subscription checkout                    | `/subscribe/*` |
| `MilestoneForm`     | Milestone policy authorization           | `/policy/*`    |
| `PayAsYouGoForm`    | Pay-as-you-go policy authorization       | `/policy/*`    |
| `OneTimePolicyForm` | One-time policy authorization            | `/policy/*`    |
| `UpToForm`          | UpTo variable-amount authorization       | `/policy/*`    |

**Order Summary (`order-summary.tsx`)**

- Displays payment details before confirmation
- Shows frequency, amount, recipient, metadata
- Responsive layout (hidden on mobile, visible on desktop)

**Hero (`hero.tsx`)**

- Left sidebar on checkout pages
- Gradient background with branding
- Product name and tagline

**Solana Provider (`solana-provider.tsx`)**

- Wraps Solana Wallet Adapter
- Provides wallet context to all components
- Handles connection state

## Environment Variables

### Required

| Variable                    | Description               | How to Get                                     |
| --------------------------- | ------------------------- | ---------------------------------------------- |
| `VITE_SOLANA_API`           | Solana RPC endpoint       | Use public endpoint or your provider           |
| `VITE_TRIBUTARY_PROGRAM_ID` | Tributary program address | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`  |
| `VITE_USDC_MINT`            | USDC token mint on Solana | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

### Optional

| Variable               | Description               | Default                |
| ---------------------- | ------------------------- | ---------------------- |
| `VITE_GATEWAY_ADDRESS` | Payment gateway authority | Pre-configured gateway |

### Production Considerations

For production deployment:

1. **RPC Endpoint**: Use a reliable provider (Helius, Triton, QuickNode) instead of public endpoint
2. **Base URL**: Configure in `CheckoutSessionManager` for production domain
3. **Redirect URLs**: Set `successUrl` and `cancelUrl` to your production pages

## Available Scripts

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `pnpm run dev`      | Start development server (Vite)  |
| `pnpm run build`    | Build for production             |
| `pnpm run preview`  | Preview production build locally |
| `pnpm run lint`     | Run ESLint                       |
| `pnpm run lint:fix` | Auto-fix ESLint issues           |

## Checkout Link Format

### Subscription Links

```
https://yourdomain.com/#/subscribe/{BASE64_ENCODED_DATA}
```

Encoded data includes:

- `mode`: "subscription"
- `tokenMint`: Token mint address
- `recipient`: Recipient wallet address
- `gateway`: Gateway authority
- `amount`: Payment amount
- `autoRenew`: Boolean
- `maxRenewals`: Number or null (unlimited)
- `paymentFrequency`: "weekly" | "monthly" | "yearly"
- `startTime`: Timestamp or null
- `trackingId`: Your tracking identifier
- `lineItems`: Array of items (optional)
- `successUrl`: Redirect after success
- `cancelUrl`: Redirect on cancel

### Payment Links

```
https://yourdomain.com/#/pay/{BASE64_ENCODED_DATA}
```

Encoded data includes:

- `mode`: "payment"
- `tokenMint`: Token mint address
- `recipient`: Recipient wallet address
- `amount`: Payment amount
- `trackingId`: Your tracking identifier
- `successUrl`: Redirect after success
- `cancelUrl`: Redirect on cancel

### Policy Links (milestone / payAsYouGo / oneTime / upTo)

```
https://yourdomain.com/#/policy/{BASE64_ENCODED_DATA}
```

The unified `/policy/` path hosts the four non-subscription, non-transfer
PaymentPolicy variants. The `mode` discriminator inside the blob selects
which form the checkout renders:

| `mode`       | Variant       | Notable encoded fields                                                           |
| ------------ | ------------- | -------------------------------------------------------------------------------- |
| `milestone`  | Milestone     | `milestoneAmounts`, `milestoneTimestamps`, `releaseCondition`, `totalMilestones` |
| `payAsYouGo` | Pay-as-you-go | `maxAmountPerPeriod`, `maxChunkAmount`, `periodLengthSeconds`                    |
| `oneTime`    | OneTime       | `amount`, `dueDate?`, `expiryDate?`                                              |
| `upTo`       | UpTo          | `maxAmount`, `validAfter?`, `deadline`                                           |

All policy variants also carry `gateway`, `recipient`, `tokenMint`,
`trackingId`, `successUrl`, `cancelUrl`, and an optional `cluster`
(`mainnet`/`devnet`/`testnet`, defaults to `mainnet`). Encoding uses
base64url(JSON) — see `packages/payments/src/core/session.ts` for the
full field map and `EncodedSessionData` shape.

## Integration with Tributary SDK

The checkout app integrates with the Tributary SDK through a wrapper layer:

### Wrapper Layer (`src/lib/tributary.ts`)

**Key Functions:**

```typescript
// Create subscription on-chain
createSubscription({
  wallet: WalletContextState,
  recipientWallet: PublicKey,
  amount: number,         // USD amount (e.g., 10 for $10)
  frequency: "weekly" | "biweekly" | "monthly",
  memo?: string,
  tokenMint?: string
}) -> Promise<SubscriptionPolicy>

// Create one-time payment on-chain
createOneTimePayment({
  wallet: WalletContextState,
  recipientWallet: PublicKey,
  amount: number,
  memo?: string,
  trackingId?: string,
  tokenMint?: string
}) -> Promise<TransactionSignature>
```

**Helper Functions:**

- `getTributary()`: Initialize Tributary SDK instance
- `mapFrequency()`: Convert UI frequency to SDK format
- `amountToBN()`: Convert USD to token smallest units (handles decimals)
- `getUserPayment()`: Fetch UserPayment PDA for wallet/mint
- `confirmTransactionWithStatus()`: Await transaction confirmation

### SDK Packages Used

```typescript
import { Tributary, PaymentFrequency } from "@tributary-so/sdk";
import { CheckoutSessionManager } from "@tributary-so/payments";
import { getTokenSymbol } from "@tributary-so/sdk";
```

## Payment Types Supported

### Direct payment vs OneTime policy

Tributary distinguishes two patterns that both move tokens once:

| Pattern                       | Mechanism                                    | Creates policy? | Pausable / deletable? | Use when                                                             |
| ----------------------------- | -------------------------------------------- | --------------- | --------------------- | -------------------------------------------------------------------- |
| **Direct payment** (this app) | Standalone `transfer` instruction (ADR-0004) | No              | No                    | Hosted checkout: pay once, immediate                                 |
| **OneTime policy** (ADR-0019) | `PaymentPolicy` with `PolicyType::OneTime`   | Yes             | Yes                   | Scheduled single-shot pull, full gateway lifecycle, composable hooks |

This app's `/pay/{blob}` route implements the **direct payment** path — funds
transfer immediately via SPL `transfer`, no policy is created, no gateway fees
apply. For policy-based single-shot flows use the `OneTime PolicyType` via
the SDK (`createOneTimePayment`) or the `apps/showcase-payment-policies` app.

### 1. Subscriptions

Recurring payments with automatic execution:

- **Amount**: Fixed payment amount per interval
- **Frequency**: Weekly, biweekly, monthly, yearly
- **Auto-renew**: Toggle for manual vs automatic renewal
- **Max Renewals**: Limit total payments (0 = unlimited)
- **Line Items**: Support for multi-item subscriptions

**Example:**

```typescript
{
  mode: "subscription",
  amount: 29.99,
  paymentFrequency: "monthly",
  autoRenew: true,
  maxRenewals: 12,  // 1-year subscription
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  recipient: "YourWalletAddress...",
  successUrl: "https://yourapp.com/success?session={trackingId}",
  cancelUrl: "https://yourapp.com/cancel?session={trackingId}"
}
```

### 2. One-Time Payments

Single, non-recurring payments (hosted-checkout "direct payment" path —
distinct from the **OneTime PolicyType** ADR-0019; see
[Direct payment vs OneTime policy](#direct-payment-vs-onetime-policy) below):

- **Amount**: Fixed payment amount
- **Tracking ID**: Optional identifier for your records
- **Redirect URLs**: Success/cancel for flow completion

**Example:**

```typescript
{
  mode: "payment",
  amount: 99.99,
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  recipient: "YourWalletAddress...",
  trackingId: "ORDER_12345",
  successUrl: "https://yourapp.com/order/12345/success",
  cancelUrl: "https://yourapp.com/order/12345/cancel"
}
```

### 3. Policy Variants (under `/policy/`)

The four PaymentPolicy variants share a `/policy/{blob}` URL path; the
`mode` field inside the blob picks the rendered form. They all create a
real PaymentPolicy PDA on-chain (unlike the direct-transfer `payment`
mode above).

| Mode         | Use case                                                    | Route                       |
| ------------ | ----------------------------------------------------------- | --------------------------- |
| `milestone`  | Escrowed payments released as milestones become due         | `/policy/{blob}#milestone`  |
| `payAsYouGo` | Per-period usage cap; recipient claims in chunks            | `/policy/{blob}#payAsYouGo` |
| `oneTime`    | Single fixed payment scheduled within a window              | `/policy/{blob}#oneTime`    |
| `upTo`       | Single variable-amount settlement bounded by max + deadline | `/policy/{blob}#upTo`       |

See `packages/payments/src/core/session.ts` (`MilestoneParams`,
`PayAsYouGoParams`, `OneTimePolicyParams`, `UpToParams`) for the exact
field shapes. The merchant-side link generator in `CheckoutLinkForm`
exposes all six modes.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard:

- `VITE_SOLANA_API`
- `VITE_TRIBUTARY_PROGRAM_ID`
- `VITE_USDC_MINT`
- `VITE_GATEWAY_ADDRESS`

### Netlify

```bash
# Build
pnpm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

```bash
docker build -t tributary-checkout .
docker run -p 4173:4173 -e VITE_SOLANA_API=... tributary-checkout
```

### Static Hosting

Build and deploy the `dist/` folder to any static hosting service:

- GitHub Pages
- AWS S3 + CloudFront
- Cloudflare Pages
- Firebase Hosting

## Testing

### Local Testing

1. **Start dev server**:

   ```bash
   pnpm run dev
   ```

2. **Generate checkout link**:

   - Navigate to [http://localhost:5173](http://localhost:5173)
   - Fill form with test data
   - Click "Generate Checkout Link"
   - Copy the generated URL

3. **Test checkout**:
   - Open the copied URL in new tab
   - Connect wallet (use devnet wallet for testing)
   - Confirm transaction
   - Verify success state and redirects

### Test Checklist

- [ ] Link generation with valid data
- [ ] Link generation with invalid data (error handling)
- [ ] Subscription checkout with wallet
- [ ] One-time payment checkout with wallet
- [ ] Redirect on success (if configured)
- [ ] Redirect on cancel (if configured)
- [ ] Mobile responsiveness
- [ ] Different token mints
- [ ] Line items display correctly
- [ ] Order summary accuracy

## Troubleshooting

### Common Issues

**"Invalid session data" error:**

- Ensure checkout URL is complete (no truncated data)
- Verify base64 encoding is intact
- Check that URL format is `/#/subscribe/...`, `/#/pay/...`, or `/#/policy/...`

**Wallet connection fails:**

- Verify wallet is unlocked
- Ensure Solana network matches (mainnet vs devnet)
- Check that RPC endpoint is responsive

**Transaction fails:**

- Check wallet has sufficient SOL for fees
- Verify wallet has sufficient token balance for payment amount
- Ensure delegation approval succeeded (for subscriptions)

**Build fails with TypeScript errors:**

```bash
# Clear cache and rebuild
rm -rf node_modules .vite dist
pnpm install
pnpm run build
```

**Vite dev server issues:**

```bash
# Kill process on port 5173
npx kill-port 5173

# Restart
pnpm run dev
```

**Environment variables not loading:**

- Ensure `.env` file is in `apps/checkout/` directory
- Variables must start with `VITE_` prefix
- Restart dev server after adding variables

## Styling

### Tailwind Configuration

Uses Tailwind CSS v4.1 with custom design tokens:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        // ... more semantic tokens
      },
    },
  },
};
```

### Radix UI Theme

Integrated via `@radix-ui/themes`:

- Light/dark mode support
- Accessible color system
- Component primitives

### Custom Components

- Built with Radix UI primitives
- Styled with Tailwind utility classes
- Animated with Framer Motion

## Security Considerations

1. **Input Validation**: All form inputs validated before processing
2. **Address Validation**: Solana address format checked via regex
3. **URL Validation**: Redirect URLs validated as valid URLs
4. **Non-Custodial**: Funds never leave user wallet control
5. **Delegation Security**: Token delegation limited to approved amounts
6. **RPC Privacy**: Use authenticated RPC endpoints in production

## Performance

### Build Optimization

- Vite's optimized bundling
- Tree-shaking of unused code
- Code splitting by route
- Lazy loading of components

### Runtime Performance

- React Query for efficient data fetching
- Memoization of expensive computations
- Minimal re-renders via proper key usage
- Framer Motion GPU-accelerated animations

## Contributing

To contribute to the checkout app:

1. Follow parent repository contribution guidelines
2. Ensure all linting passes: `pnpm run lint`
3. Test on multiple browsers (Chrome, Firefox, Safari)
4. Verify mobile responsiveness
5. Test checkout flow with actual wallets

## License

MIT License - see parent repository [LICENSE](../../LICENSE) file.

## Related Links

- **Tributary Docs**: [docs.tributary.so](https://docs.tributary.so)
- **Main Repository**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **SDK Documentation**: See `sdk/` package in parent repo
- **Smart Contract**: See `programs/tributary/` in parent repo
2026-07-07: v2 release
