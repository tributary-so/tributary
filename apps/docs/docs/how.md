# Basics

Tributary enables automated recurring payments on Solana through token delegation - users approve payments once, and the protocol handles execution automatically.

## 🔄 Payment Flow

1. **User Approval**: User delegates spending authority to Tributary smart contracts for specific amounts and schedules
2. **Policy Creation**: Flexible payment policies define when and how much to pay
3. **Automated Execution**: Smart contracts process payments according to the agreed schedule
4. **Direct Transfer**: Funds move directly from user token accounts to recipients

## 🎯 For Different Audiences

### End Users

#### Getting Started with Payments

- Connect your Solana wallet (Phantom, Solflare, etc.)
- Choose a payment provider service
- Approve one-time delegation for your desired payment schedule
- Payments execute automatically - no more manual transactions!

#### Managing Your Payments

- View all active subscriptions in your provider's dashboard
- Pause, modify, or cancel payments anytime
- Full transparency with payment history and upcoming charges

### Payment Providers

#### Building on Tributary

- Install the SDK: `npm install @tributary-so/sdk @tributary-so/sdk-react`
- Create payment policies for your users
- Handle onboarding, webhooks, and customer support
- Earn fees on payment volume

#### Provider Examples

- SaaS subscription platforms
- Creator economy services
- DeFi protocol payments
- E-commerce solutions

[Learn more about building providers →](providers.md)

### Protocol Developers

#### Technical Implementation

- **Smart Contracts**: Rust/Anchor programs handling payment logic
- **Token Delegation**: Solana's native delegation for secure, automatic withdrawals
- **Payment Policies**: Configurable rules for different payment types
- **Multi-Token Support**: Any SPL token, not just USDC

#### Supported Payment Types

- Subscriptions (fixed recurring amounts)

#### Future Payment Types

- Installments (scheduled partial payments)
- Usage-based (variable amounts by consumption)
- Membership dues (regular membership fees)
- Donations (ongoing creator support)

[Technical architecture details →](architecture.md)

## 📊 Key Benefits

- **No Fund Lock-up**: Payments from your wallet, not deposited contracts
- **True Automation**: One signature enables ongoing payments
- **Full Control**: Pause, modify, or cancel anytime
- **Any Token**: Support for all Solana SPL tokens
- **Transparent**: All transactions visible on blockchain

## 🔗 Related Documentation

- [Protocol Architecture](architecture.md) - Technical deep-dive
- [Use Cases](use-cases.md) - Business applications
- [Payment Providers](providers.md) - Building services
- [Why Tributary?](why.md) - Problem & solution overview

Ready to get started? Choose your path above or [explore use cases →](use-cases.md)
