# Tributary App

A modern React application for automated recurring payments on Solana blockchain. Web2 subscription UX with Web3 transparency using token delegation.

## Overview

Tributary enables seamless recurring payments on Solana with a one-time signature. Users approve token delegation once, then payments execute automatically according to predefined policies. The app provides a clean, intuitive interface for managing payment gateways, policies, and subscriptions.

## Stack

| Category   | Technology                               |
| ---------- | ---------------------------------------- |
| Build Tool | Vite 7.x                                 |
| Framework  | React 19.x with TypeScript               |
| Routing    | react-router v7.x (HashRouter)           |
| Styling    | Tailwind CSS 4.x with HeroUI components  |
| State      | Jotai (global) + TanStack Query (server) |
| Blockchain | Solana Web3.js with wallet adapters      |
| Icons      | Lucide React                             |
| Animations | Framer Motion                            |
| Date       | date-fns                                 |
| Code Style | ESLint + Prettier                        |

## Directory Structure

```
apps/app/
├── .gitignore
├── .prettierrc
├── .prettierignore
├── components.json
├── eslint.config.js
├── index.html                  # Entry point with #root div
├── package.json
├── tailwind.config.js          # Tailwind 4 + HeroUI config
├── tsconfig.json               # Path aliases
├── tsconfig.app.json           # App TypeScript config
├── tsconfig.node.json          # Node TypeScript config
├── vite.config.ts              # Vite config with base: "./"
├── public/
│   ├── logo.svg
│   ├── favicon.ico
│   ├── gt-cinetype.ttf        # Primary font
│   └── denim.ttf              # Secondary font
└── src/
    ├── index.css              # Tailwind directives + CSS vars for theming
    ├── main.tsx               # ReactDOM.createRoot + HashRouter
    ├── app.tsx                # Routes + Header + Footer wrapper
    ├── components/
    │   ├── app-header.tsx     # Nav with dropdown, theme toggle, wallet
    │   ├── app-footer.tsx     # Footer with links
    │   ├── app-layout.tsx     # Layout wrapper
    │   ├── app-providers.tsx  # React Query + Solana + HeroUI providers
    │   ├── dashboard/         # Main dashboard interface
    │   ├── account/           # Account management
    │   ├── referral-program/  # Referral program page
    │   ├── cluster/           # Solana cluster UI
    │   ├── solana/            # Solana provider + wallet
    │   └── ui/                # Reusable UI components
    └── lib/
        └── ...                # Utility functions
```

## 1. Vite Config (vite.config.ts)

**Critical**: `base: "./"` for GitHub Pages static hosting.

```typescript
export default defineConfig({
  base: './', // CRITICAL for GitHub Pages
  // ... Solana polyfills, wallet adapters, etc.
})
```

## 2. Tailwind Config (tailwind.config.js)

Tailwind 4 with HeroUI components. Custom theme with professional blue-based colors optimized for light and dark modes.

```javascript
module.exports = {
  darkMode: 'class',
  themes: {
    light: { colors: { primary: '#221.2 83.2% 53.3%', ... } },
    dark: { colors: { primary: '#217.2 91.2% 59.8%', ... } }
  },
  plugins: [heroui()],
}
```

## 3. Globals CSS (src/index.css)

Tailwind 4 directives + CSS variables for theming using HSL color format.

```css
@import 'tailwindcss';

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --primary: 221.2 83.2% 53.3%;
  --font-primary: 'GT Cinetype', 'Inter', sans-serif;
  --font-secondary: 'Denim', 'Antonio', sans-serif;
  /* ... semantic colors */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

## 4. Entry Point (src/main.tsx)

Uses `HashRouter` for GitHub Pages compatibility.

```tsx
import { HashRouter } from 'react-router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
```

## 5. App Component (src/app.tsx)

Wrapper with providers, routes, header, and footer.

```tsx
export function App() {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background antialiased font-sans">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4">
          <Routes>
            <Route index element={<LazyDashboard />} />
            {/* ... more routes */}
          </Routes>
        </main>
        <AppFooter />
      </div>
    </AppProviders>
  )
}
```

## 6. Header Component (src/components/app-header.tsx)

Navigation with wallet connection, dropdown menus, theme toggle, and mobile responsive design following ChainSquad design patterns.

Key features:

- Clean uppercase navigation with tracking
- Product dropdown menus
- Dark/light theme toggle with localStorage persistence
- Mobile hamburger menu
- Wallet connection button

## 7. Footer Component (src/components/app-footer.tsx)

Multi-column footer with social links, resources, and copyright.

```tsx
<footer className="border-t border-border/50">
  <div className="mx-auto max-w-5xl px-4 py-12">{/* 4-column grid layout */}</div>
</footer>
```

## 8. Dashboard Component (src/components/dashboard/dashboard-feature.tsx)

Main landing page with:

- Hero section with stats sidebar
- Quick action cards with icons
- Section dividers (`//`)
- CTA banner

## Key Features

- **Automated Recurring Payments**: Set up subscriptions that execute automatically on Solana
- **Token Delegation**: One-time approval enables seamless recurring transactions
- **Payment Gateways**: Configure and manage payment processing with custom fees
- **Policy Management**: Create flexible payment policies with custom schedules
- **Wallet Integration**: Full Solana wallet adapter support (Phantom, Solflare, etc.)
- **Real-time Dashboard**: Monitor payments, balances, and transaction history
- **Responsive Design**: Modern UI built with Tailwind CSS and HeroUI components
- **Dark/Light Theme**: Built-in theme toggle with localStorage persistence

## Routes

| Path        | Component             | Description                 |
| ----------- | --------------------- | --------------------------- |
| `/`         | `LazyDashboard`       | Main dashboard landing page |
| `/about`    | `LazyDashboard`       | About section (dashboard)   |
| `/demo`     | `LazyDashboard`       | Demo section (dashboard)    |
| `/docs`     | `LazyDashboard`       | Docs section (dashboard)    |
| `/account`  | `LazyAccount`         | User account management     |
| `/referral` | `LazyReferralProgram` | Referral program page       |

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

## Prerequisites

- **Node.js**: 20.x or higher
- **pnpm**: Recommended package manager
- **Solana Wallet**: Phantom, Solflare, or compatible wallet extension

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build workspace dependencies
cd ../../packages/sdk && pnpm run build
cd ../sdk-react && pnpm run build
cd ../../apps/app

# 3. Start development server
pnpm dev

# 4. Build for production
pnpm build
```

## Architecture

### Component Architecture

- **Feature Components**: Self-contained modules (dashboard, account)
- **UI Components**: Reusable design system components in `ui/` directory
- **Layout Components**: App-wide layout and navigation components
- **Provider Components**: Context providers for HeroUI, Solana, and data fetching

### State Management

- **Jotai**: Global state for user preferences and app settings
- **TanStack Query**: Server state management for blockchain data and API calls
- **React Context**: Theme and Solana provider contexts

### Blockchain Integration

- **Solana Provider**: Connection management and network switching
- **Wallet Adapters**: Support for multiple Solana wallets (Phantom, Solflare)
- **SDK Integration**: Uses `@tributary-so/sdk` and `@tributary-so/sdk-react` for program interactions

## Styling

### Design System

- **HeroUI**: Component library with consistent design tokens
- **Tailwind CSS 4**: Utility-first styling with HSL color variables
- **Dark Mode**: Full dark/light theme support with localStorage persistence
- **Custom Fonts**: GT Cinetype (primary) + Denim (secondary)
- **No Rounded Corners**: ChainSquad design pattern with `rounded-none`

### Color Palette

HSL-based color scheme optimized for both light and dark modes:

```css
/* Light theme */
--primary: 221.2 83.2% 53.3%; /* Professional blue */
--background: 0 0% 100%; /* White */
--foreground: 222.2 47.4% 11.2%; /* Dark slate */

/* Dark theme */
--primary: 217.2 91.2% 59.8%; /* Lighter blue */
--background: 222.2 84% 4.9%; /* Near black */
--foreground: 210 40% 98%; /* Light gray */
```

### Responsive Design

Mobile-first approach with responsive breakpoints and touch-friendly interactions.

## GitHub Pages Deployment

### Build Command

```bash
pnpm build
```

Creates `dist/` folder with static files ready for deployment.

### GitHub Actions Workflow

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
```

### GitHub Pages Settings

1. Go to repository **Settings** → **Pages**
2. Set **Source** to **GitHub Actions**

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
```

## Troubleshooting

### Build Issues

**Problem**: `Cannot resolve dependency '@tributary-so/sdk'`
**Solution**: Ensure SDK packages are built:

```bash
cd ../../packages/sdk && pnpm run build
cd ../sdk-react && pnpm run build
```

### Wallet Connection Issues

**Problem**: Wallet not connecting in development
**Solution**: Ensure you're running on `localhost` or `tributary.so.local`

### Styling Issues

**Problem**: Tailwind classes not applying
**Solution**: Verify `tailwind.config.js` content paths include all source files

### Theme Not Persisting

**Problem**: Theme resets on page reload
**Solution**: Check browser localStorage and ensure `ThemeToggle` component is loaded

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Wallet Extensions**: Compatible with all Solana wallet browser extensions

## License

MIT License
2026-08-01: new pools-client
