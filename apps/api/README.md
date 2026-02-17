# @tributary-so/api

Modular Express API for Tributary subscription and payment services.

## Features

- **Modular Architecture**: Clean separation of routes, middleware, services, and types
- **Easy to Split**: Designed to easily split individual API endpoints into separate microservices
- **RESTful Design**: Standard REST API with `/api/v1` prefix
- **Subscription Status**: Check subscription status by tracking ID using the PaymentTracker
- **Health Monitoring**: Built-in health check endpoint
- **Error Handling**: Centralized error handling and logging
- **Type Safety**: Full TypeScript support with comprehensive types

## Project Structure

```
api/
├── src/
│   ├── routes/          # Individual route modules (easy to split into separate services)
│   │   ├── health.ts   # Health check endpoint
│   │   ├── skill.ts    # Lando skill markdown generation
│   │   └── subscription.ts  # Subscription status checking
│   ├── middleware/      # Shared middleware
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   ├── services/       # Business logic services
│   │   ├── solana.ts      # Solana connection management
│   │   └── subscription.ts # Subscription status tracking
│   ├── types/          # TypeScript types
│   └── index.ts        # Main application entry point
├── package.json
├── tsconfig.json
└── Dockerfile
```

## API Endpoints

### Health
- `GET /api/v1/health` - Health check endpoint

### Skill
- `GET /api/v1/skill/:encoded` - Generate Lando skill markdown from encoded subscription data

### Subscription
- `GET /api/v1/subscription/status/:trackingId` - Check subscription status
  - Query params:
    - `userPublicKey` (optional): User's public key for user-based lookup
    - `gatewayPublicKey` (optional): Gateway's public key for gateway-based lookup
    - `tokenMint` (optional): Token mint address
- `GET /api/v1/subscription/:trackingId` - Get full subscription details
  - Query params:
    - `userPublicKey` (optional): User's public key for user-based lookup
    - `gatewayPublicKey` (optional): Gateway's public key for gateway-based lookup
    - `tokenMint` (optional): Token mint address

## Development

### Install Dependencies
```bash
cd api
pnpm install
```

### Development Mode
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

### Start Server
```bash
pnpm start
```

## Environment Variables

- `PORT` - Server port (default: 3002)
- `SOLANA_RPC` - Solana RPC URL (default: https://api.mainnet-beta.solana.com)

## Microservice Splitting

The modular structure makes it easy to split individual APIs into separate projects:

1. Each route module (`src/routes/*.ts`) is self-contained
2. Services and types can be extracted into shared packages
3. Middleware can be reused across services
4. Each endpoint can be deployed independently

Example: To split `/api/v1/subscription` into a separate service:
1. Copy `src/routes/subscription.ts` to new project
2. Copy required services (`src/services/subscription.ts`, `src/services/solana.ts`)
3. Copy types (`src/types/index.ts`)
4. Copy middleware (`src/middleware/*`)
5. Adjust imports and deploy

## License

MIT
