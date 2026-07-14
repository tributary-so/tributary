# Tributary Checkout

A hosted checkout solution that lets anyone accept recurring payments on Solana without building a payment system from scratch.

## What It Does

Tributary Checkout provides a pre-built, customizable payment page for subscriptions and one-time payments. Instead of coding your own checkout flow, you generate a link and share it—customers pay, funds transfer automatically, and you don't need any backend infrastructure.

## Who It's For

**Creators & Freelancers**

- Newsletter writers with paid subscriptions
- Consultants with recurring retainers
- Content creators with membership tiers
- Coaches with ongoing client programs

**SaaS Companies**

- Startups launching MVPs without payment engineering
- Tools testing market fit before building custom billing
- Products wanting Web3 payment options alongside traditional methods

**Marketplaces & Platforms**

- Multi-vendor marketplaces needing split payments
- Creator platforms processing subscriptions
- Job boards with premium listings
- Service marketplaces with recurring fees

**Organizations**

- Nonprofits accepting recurring donations
- Member associations with dues
- Collectives pooling resources
- DAOs with treasury inflows

## Key Benefits

**No Backend Required**

- Generate checkout links in seconds
- No servers, databases, or payment infrastructure to manage
- Hosted solution handles all complexity

**Recurring Payments Made Simple**

- Weekly, monthly, or yearly billing
- Automatic payment execution on schedule
- Customers can pause or cancel anytime

**Non-Custodial Security**

- Funds stay in customer wallets until payment
- No third-party custodial risk
- Full transparency on Solana blockchain

**Share Anywhere**

- Links work on social media, email, websites, messaging apps
- Embed in newsletters or blog posts
- Use in DMs or community channels

**Low Fees**

- Protocol takes 20% of gateway fees (~1% at typical rates vs 2.9% + 30¢ in traditional payments)
- Instant settlement (no multi-day holds)
- No chargebacks or fraud disputes

## How It Works

1. **Configure Your Payment**: Set amount, frequency (for subscriptions), and recipient wallet address
2. **Generate Link**: Get a unique URL containing your payment configuration
3. **Share**: Post the link wherever you want to collect payments
4. **Customer Pays**: Customer clicks link, connects wallet, and approves payment
5. **Automation**: Payments execute automatically on schedule for subscriptions

## Use Cases

### Monthly Subscriptions

```
Amount: $29/month
Frequency: Monthly
Auto-renew: Yes
Max renewals: Unlimited

Use case: SaaS tool, content membership, premium access
```

### Time-Limited Subscriptions

```
Amount: $199/year
Frequency: Yearly
Auto-renew: Yes
Max renewals: 3 (3-year maximum)

Use case: Certification program, seasonal service, limited-term access
```

### One-Time Payments

```
Amount: $99
Type: Single payment

Use case: Digital product, consulting session, event ticket
```

### Multi-Item Orders

```
Item 1: Course access - $499
Item 2: Community membership - $29/month
Item 3: 1-on-1 coaching call - $150
Total: $678 (one-time)

Use case: Product bundles, package deals, course + membership
```

### Flexible Pricing

```
Use base amount OR add line items
Custom tracking IDs for your systems
Success/cancel redirect URLs for your app

Use case: Dynamic pricing, A/B testing, conversion tracking
```

## Integration Options

### Standalone Links

- Share checkout links directly
- No website required
- Perfect for social media, email, DMs

### Embedded in Your Site

- Use links as "Subscribe" buttons
- Redirect back to your pages
- Seamless integration with existing site

### API-Powered

- Generate links programmatically
- Integrate with your CRM or database
- Create custom checkout flows

## What You Don't Need

❌ Merchant account setup
❌ KYC/AML verification (for most use cases)
❌ Payment processor integration (Stripe, PayPal, etc.)
❌ Credit card handling
❌ Bank account linking
❌ PCI compliance
❌ Chargeback management
❌ Fraud detection systems
❌ Recurring billing infrastructure
❌ Database for subscriptions
❌ Webhook handlers

## What Your Customers Need

✅ A Solana wallet (Phantom, Backpack, Solflare, etc.)
✅ Tokens to pay with (SOL, USDC, or other supported tokens)
✅ Internet connection

## Real-World Examples

**Newsletter Subscription**

> "Get the premium newsletter every month for $10. Payments handled automatically—no hassle."

**Retainer Agreement**

> "Monthly consulting retainer: $2,000/month. Auto-renew until project completion."

**Community Membership**

> "Join the Discord community for $25/month. Cancel anytime, keep access until month end."

**Digital Course**

> "Complete the course for $199. One-time payment, lifetime access."

**Nonprofit Donation**

> "Support our mission with a monthly donation of $50. 100% goes to the cause."

## Comparison

| Feature             | Tributary Checkout    | Stripe/PayPal                 |
| ------------------- | --------------------- | ----------------------------- |
| Setup time          | Seconds               | Days (KYC, approval)          |
| Backend required    | No                    | Yes                           |
| Bank account needed | No                    | Yes                           |
| Fees                | 1%                    | 2.9% + 30¢                    |
| Settlement          | Instant               | 2-7 business days             |
| Chargebacks         | No                    | Yes (fraud risk)              |
| Recurring payments  | Native                | Complex setup                 |
| Global access       | Yes (no restrictions) | Country restrictions          |
| Transparency        | On-chain, verifiable  | Private, opaque               |
| Custodial risk      | None (non-custodial)  | Yes (funds held by processor) |

## Getting Started

### Quick Start (No Code)

1. Visit checkout.tributary.so
2. Fill in payment details (amount, frequency, your wallet address)
3. Click "Generate Checkout Link"
4. Share the link wherever you want to collect payments

### With Your Own Domain

1. Deploy the checkout app to your domain
2. Configure your wallet address and payment settings
3. Generate links pointing to your domain
4. Customize branding to match your brand

### API Integration

Use the `@tributary-so/payments` SDK to programmatically generate checkout links from your application. See the README.md for technical details.

## Why Tributary?

**Built for Web3 First**

- Designed for crypto-native users
- Wallets instead of credit cards
- Blockchain transparency instead of black-box processing

**Developer-Friendly**

- Open-source and extensible
- TypeScript SDKs for customization
- Community-driven development

**Fair Economics**

- Low, transparent fees (1%)
- No hidden costs or tiered pricing
- Funds settle immediately

**Secure by Design**

- Non-custodial architecture
- No single point of failure
- Audited smart contracts

**Permissionless**

- No account approval required
- No geographic restrictions
- Open to anyone with a wallet

## Support & Resources

- **Documentation**: docs.tributary.so
- **GitHub**: github.com/tributary-so/tributary
- **Community**: Join our Discord for help
- **Twitter**: @tributary_so for updates

## License

MIT License - Free to use, modify, and deploy.

---

**Tributary Checkout: Recurring payments, simplified.**
