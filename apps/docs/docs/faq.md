# Frequently Asked Questions (FAQ)

## Security and Delegation Model

### Is delegation secure? What are the risks?

Delegation in Tributary is designed to be non-custodial, meaning your funds remain in your wallet at all times. When you delegate payment authority, you're only approving the protocol to withdraw a specific amount for a defined subscription period (e.g., $120 for a $10/month subscription over 12 months). This is much safer than traditional Web3 alternatives that approve the entirety of your balance or require hot private keys in AI agents.

The protocol is open-source, will undergo professional security audits, and is secured by multisig governance. Plans include decentralizing ownership via DAO governance to prevent any single entity from updating the contract. Unlike custodial solutions, you can revoke delegation at any time, and the contract enforces strict limits on what can be withdrawn.

### Is "funds stay in your wallet" misleading?

No, it's technically accurate but requires context. In Tributary's non-custodial model, funds remain in your wallet— the protocol only gets delegated authority to pull specific amounts within approved parameters. This differs from actual self-custody where you're the only one who can move funds, but it's a significant improvement over fund lock-up in smart contracts or repeated manual approvals.

The delegation is limited to the exact subscription amount and duration you approve, making it far safer than giving unlimited access or storing funds in a third-party contract.

### How does Tributary compare to hot private keys in other systems?

Systems like x402 require clients to sign transactions with internet-connected private keys, creating "hot" wallets that are inherently risky. Tributary replaces this with a public contract that states clear limits on withdrawals. A single, well-reviewed delegation signature is more secure than repeatedly approving transactions from potentially malicious websites. The contract's transparency and revocability provide better protection than trusting hot keys.

Unlike protocols where private keys must be accessible to AI agents or bots—granting access to your entire wallet and all assets—Tributary's delegation is limited to a specific token (e.g., USDC) and a predefined amount. This significantly reduces the impact radius of any potential compromise, allowing private keys to remain cold and secure.

## Adoption and Use Cases

### Why recurring payments? Don't users prefer one-time payments in DeFi?

While one-time payments are common in DeFi, recurring subscriptions have low adoption due to poor UX and security concerns. Tributary addresses this by offering "sign once, pay forever" automation without custody risk.

Traditional SaaS subscriptions converting to crypto often add friction, but Tributary's model works best for Web3-native businesses needing predictable revenue.

### What's Tributary's advantage over Stripe or other payment processors?

Tributary is built for Solana: non-custodial, supports SPL tokens natively, and leverages Solana's speed and low costs. Unlike other providers, which often require fiat settlement and centralized processing, Tributary enables native crypto subscriptions with full on-chain transparency. Businesses get predictable revenue without the high fees and custody risks of traditional processors.

For developers, Tributary provides SDKs and React components for easy integration, competing directly with Web2 simplicity while maintaining Web3 sovereignty.

## Technical and Operational

### Is multi-token support a differentiator?

Multi-token support (including SPL tokens) is table stakes for Solana payment protocols. Tributary supports this as standard, along with advanced scheduling features.

### Has Tributary been audited? What about the MVP timeline?

The protocol is open-source and will be audited by professional firms as soon as possible. The 3-week MVP demonstrates rapid execution but includes comprehensive testing and security measures. Recurring payments handle real money, so we've prioritized security from day one including plans for governance decentralization of the contract upgrade authority itself.

### What makes Tributary unique on Solana?

Tributary is the first and only non-custodial recurring payment protocol on Solana that uses delegation to automate subscriptions. This "sign once" model provides Web2-like UX with Web3 security, creating network effects through our provider ecosystem.

## Getting Started

### How do I integrate Tributary?

Check our [Developer Guide](quickstart/integration.md) for SDK integration. The React components make it easy to add subscription buttons in minutes.

### Where can I learn more?

Visit our [documentation](https://docs.tributary.so) or join our Discord community for support.
