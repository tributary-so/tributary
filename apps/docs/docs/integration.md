# Integration Options

Tributary offers multiple ways to integrate automated payments. Choose the method that fits your use case.

## Integration Methods

### 1. Payments SDK 🛒

_Best for: Quick checkout links with zero API keys_

- Use `@tributary-so/payments` for simplified payments via hosted checkout page
- Generate shareable payment URLs
- Track subscription and one-time payment status
- Zero configuration required

```typescript
import { PaymentsClient } from "@tributary-so/payments";

const payments = new PaymentsClient(connection, tributary);
const session = await payments.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ description: "Pro Plan", unitPrice: 10, quantity: 1 }],
  paymentFrequency: "monthly",
  tributaryConfig: { gateway, recipient, trackingId },
});
```

👉 **Get Started:** [Checkout](./checkout.md)

---

### 2. Direct SDK Integration 💻

_Best for: Full programmatic control and custom flows_

- Use `@tributary-so/sdk` for complete protocol interaction
- Build custom payment UI and logic
- Full control over transaction construction
- Support for all payment types (subscriptions, milestones, pay-as-you-go)

```typescript
import { Tributary } from "@tributary-so/sdk";

const tributary = new Tributary(connection, wallet);
const instructions = await tributary.createSubscriptionInstruction(/*...*/);
```

👉 **Get Started:** [Integration](./integration.md) | [SDK Reference](./sdk.md)

---

### 3. React Button 🚀

_Best for: Fast integration in React applications_

- Use `@tributary-so/sdk-react` for pre-built components
- Drop-in subscription buttons with minimal code
- Built-in wallet integration and error handling
- Ideal for web apps and dashboards

```tsx
import { SubscriptionButton } from "@tributary-so/sdk-react";

<SubscriptionButton
  amount={new BN(10000000)}
  recipient={recipient}
  interval={PaymentInterval.Monthly}
  label="Subscribe $10/month"
/>;
```

👉 **Get Started:** [Button Integration](react-button.md)

---

### 4. REST API 📡

_Best for: Backend integration and real-time notifications_

- Query subscription status and payment events
- WebSocket notifications for payment events
- Webhook management for external notifications
- No SDK required - pure HTTP

```bash
# Get subscription status
curl "https://api.tributary.so/v1/subscriptions?trackingId=my-sub"

# WebSocket for real-time updates
socket.emit("subscribe", { trackingId: "my-sub" });
```

👉 **Get Started:** [API Overview](./api/overview.md)

---

### 5. x402 HTTP Payments 🌐

_Best for: API monetization and micropayments_

- Express.js middleware for HTTP 402 payments
- Subscription or pay-as-you-go billing
- JWT-based authenticated access
- Standards-compliant HTTP payment protocol

```typescript
import { createX402Middleware } from "@tributary-so/x402";

app.use(
  "/api/premium",
  createX402Middleware({
    scheme: "deferred",
    amount: 100,
    recipient: process.env.RECIPIENT!,
  })
);
```

👉 **Get Started:** [x402 Overview](./x402.md)

---

## Choosing the Right Integration

| Use Case                 | Method               |
| ------------------------ | -------------------- |
| Share payment links      | Payments SDK         |
| AI agent monetization    | Payments SDK         |
| Custom payment UI        | Direct SDK           |
| Complex payment logic    | Direct SDK           |
| React web app            | React Button         |
| Backend-only integration | REST API             |
| API monetization         | x402                 |
| Real-time notifications  | REST API + WebSocket |

## SDK Packages

| Package                   | Purpose                   |
| ------------------------- | ------------------------- |
| `@tributary-so/sdk`       | Core protocol interaction |
| `@tributary-so/payments`  | Simplified payments SDK   |
| `@tributary-so/sdk-react` | React components          |
| `@tributary-so/x402`      | HTTP 402 middleware       |
| `@tributary-so/cli`       | Command-line tools        |

## Next Steps

1. **Learn the Protocol:** [What is Tributary?](./what.md)
2. **Choose Your Integration:** Review quickstart guides above
3. **JWT Authentication:** [Verify subscriptions after checkout](./jwt-auth.md)
4. **Explore Payment Types:** [Subscriptions](./policies/subscription.md), [Milestones](./policies/milestone.md), [Pay-as-you-go](./policies/payasyougo.md)
5. **Build:** Check [use cases](./use-cases.md) for inspiration

## Need Help?

- 📖 [SDK Reference](./sdk.md)
- 📖 [API Reference](./api/overview.md)
- ❓ [FAQ](./faq.md)
- 💬 [Discord](https://discord.gg/tributary)
