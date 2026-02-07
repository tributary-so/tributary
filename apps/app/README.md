# Tributary App

A modern React application for automated recurring payments on Solana blockchain. Web2 subscription UX with Web3 transparency using token delegation.

## Overview

Tributary enables seamless recurring payments on Solana with a one-time signature. Users approve token delegation once, then payments execute automatically according to predefined policies. The app provides a clean, intuitive interface for managing payment gateways, policies, and subscriptions.

## Key Features

- **Automated Recurring Payments**: Set up subscriptions that execute automatically on Solana
- **Token Delegation**: One-time approval enables seamless recurring transactions
- **Payment Gateways**: Configure and manage payment processing with custom fees
- **Policy Management**: Create flexible payment policies with custom schedules
- **Wallet Integration**: Full Solana wallet adapter support (Phantom, Solflare, etc.)
- **Real-time Dashboard**: Monitor payments, balances, and transaction history
- **Responsive Design**: Modern UI built with Tailwind CSS and HeroUI components

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 4.x with HeroUI components
- **Routing**: React Router 7.x
- **State Management**: Jotai for global state
- **Data Fetching**: TanStack Query for server state
- **Blockchain**: Solana Web3.js with wallet adapters
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **Code Quality**: ESLint + Prettier

## Prerequisites

- **Node.js**: 20.x or higher
- **pnpm**: Recommended package manager (or npm/yarn)
- **Solana Wallet**: Phantom, Solflare, or compatible wallet extension

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/tributary.git
cd tributary/app
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

The app uses workspace dependencies from the parent Tributary project. Ensure the SDK packages are built:

```bash
# From the project root
cd ../sdk && pnpm run build
cd ../sdk-react && pnpm run build
```

### 4. Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### 5. Build for Production

```bash
pnpm build
```

### 6. Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
src/
├── components/
│   ├── account/           # Account management features
│   ├── dashboard/         # Main dashboard interface
│   ├── payment-policy/    # Payment policy creation/management
│   ├── presentation/      # Demo and presentation components
│   ├── ui/               # Reusable UI components
│   ├── solana/           # Solana blockchain integration
│   ├── app-header.tsx    # Main navigation header
│   ├── app-layout.tsx    # App layout wrapper
│   ├── app-hero.tsx      # Hero section component
│   └── app-footer.tsx    # Footer component
├── lib/
│   ├── client.ts         # API client configuration
│   ├── utils.ts          # Utility functions
│   └── token-store.ts    # Token storage utilities
├── app.tsx               # Main app component with routing
├── main.tsx              # App entry point
└── index.css             # Global styles
```

## Available Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Start development server with hot reload           |
| `pnpm build`        | Build for production                               |
| `pnpm preview`      | Preview production build locally                   |
| `pnpm lint`         | Run ESLint for code quality checks                 |
| `pnpm format`       | Format code with Prettier                          |
| `pnpm format:check` | Check code formatting                              |
| `pnpm ci`           | Run full CI pipeline (build + lint + format check) |

## Architecture

### Component Architecture

The app follows a feature-based component structure:

- **Feature Components**: Self-contained modules (dashboard, payment-policy, account)
- **UI Components**: Reusable design system components in `ui/` directory
- **Layout Components**: App-wide layout and navigation components
- **Provider Components**: Context providers for theme, Solana, and data fetching

### State Management

- **Jotai**: Global state for user preferences and app settings
- **TanStack Query**: Server state management for blockchain data and API calls
- **React Context**: Theme and Solana provider contexts

### Routing

Uses React Router with hash-based routing for static deployment compatibility:

```typescript
const routes: RouteObject[] = [
  { index: true, element: <LazyDashboard /> },
  { path: 'account', element: <LazyAccount /> },
  { path: 'quickstart', element: <LazyPaymentPolicy /> },
  // ... more routes
]
```

### Blockchain Integration

- **Solana Provider**: Connection management and network switching
- **Wallet Adapters**: Support for multiple Solana wallets
- **SDK Integration**: Uses `@tributary-so/sdk` and `@tributary-so/sdk-react` for program interactions

## Key Components

### Dashboard (`/`)

Main landing page with overview of payment activity, recent transactions, and quick actions.

### Payment Policy (`/quickstart`)

Create and manage recurring payment policies with:

- Custom payment schedules
- Amount configuration
- Recipient setup
- Integration code generation

### Account (`/account`)

User account management with:

- Wallet connection status
- Transaction history
- Payment gateway management
- Profile settings

### Presentations (`/hackathon`, `/x402`)

Demo and presentation components for showcasing Tributary features.

## Styling

### Design System

- **HeroUI**: Component library with consistent design tokens
- **Tailwind CSS**: Utility-first styling with custom color palette
- **Dark Mode**: Full dark/light theme support with `next-themes`

### Color Palette

Custom neutral-based color scheme optimized for both light and dark modes:

```typescript
// Light theme primary colors
primary: '#000000' // Pure black for strong contrast
secondary: '#d1c4e9' // Light purple accent
success: '#81c784' // Green for positive actions
warning: '#ffb74d' // Orange for warnings
danger: '#e57373' // Red for errors
```

### Responsive Design

Mobile-first approach with responsive breakpoints and touch-friendly interactions.

## Development

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency rules
- **Prettier**: Automatic code formatting
- **Import Sorting**: Organized imports with path aliases

### Path Aliases

Configured for clean imports:

```typescript
import { Button } from '@/components/ui/button'
import { useSolana } from '@/components/solana/solana-provider'
import { utils } from '@/lib/utils'
```

### Build Optimization

- **Code Splitting**: Automatic chunking for vendor libraries
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and font preloading
- **ESNext Target**: Modern JavaScript output

## Deployment

### Static Site Generation

The app builds to static files suitable for deployment on:

- **Vercel**: Connect GitHub repo for automatic deployments
- **Netlify**: Drag-and-drop dist folder or connect repository
- **GitHub Pages**: Use GitHub Actions for automated publishing
- **AWS S3 + CloudFront**: Static hosting with CDN
- **Traditional Web Servers**: Apache/Nginx serving static files

### Build Output

```bash
pnpm build
```

Generates optimized static files in the `dist/` directory.

### Environment Variables

No runtime environment variables required - all configuration is handled through wallet connections and SDK defaults.

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Wallet Extensions**: Compatible with all Solana wallet browser extensions

## Contributing

1. Follow the established code style and component patterns
2. Use TypeScript for all new code
3. Test components with React Testing Library (when applicable)
4. Run `pnpm ci` before committing
5. Follow conventional commit messages

## Troubleshooting

### Build Issues

**Problem**: `Cannot resolve dependency '@tributary-so/sdk'`
**Solution**: Ensure SDK packages are built in the workspace:

```bash
cd ../sdk && pnpm run build
cd ../sdk-react && pnpm run build
```

### Wallet Connection Issues

**Problem**: Wallet not connecting in development
**Solution**: Ensure you're running on `localhost` or `tributary.so.local` (configured in vite.config.ts)

### TypeScript Errors

**Problem**: Module resolution issues
**Solution**: Check tsconfig paths and ensure workspace dependencies are properly linked

### Styling Issues

**Problem**: Tailwind classes not applying
**Solution**: Verify `tailwind.config.js` and ensure content paths include all source files

## License

MIT License - see project root LICENSE file.
