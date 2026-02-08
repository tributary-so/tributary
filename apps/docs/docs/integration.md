# 🔌 Integration Options

Tributary offers multiple ways to integrate automated payments into your application. Choose the integration method that best fits your use case and technical requirements.

## Integration Methods

### 1. **Direct SDK Integration** 💻
*Best for: Full programmatic control and custom payment flows*

- Use `@tributary-so/sdk` for complete protocol interaction
- Build custom payment UI and logic
- Full control over transaction construction
- Best for advanced developers and complex use cases

👉 **Get Started:** [SDK Quickstart](./quickstart/integration.md) | [SDK Reference](./sdks.md)

---

### 2. **React Button** 🚀
*Best for: Fast integration in React applications*

- Use `@tributary-so/sdk-react` for pre-built payment components
- Drop-in subscription buttons with minimal code
- Built-in wallet integration and error handling
- Ideal for web apps and dashboards

👉 **Get Started:** [Button Quickstart](./quickstart/button.md)

---

### 3. **Checkout Page Links** 🛒
*Best for: Service agents monetizing via customer agents*

- Generate payment URLs without any frontend code
- Simple link sharing for subscriptions
- Perfect for AI-to-AI payments (e.g., Lando)
- Zero UI dependencies

👉 **Get Started:** [Checkout Page Quickstart](./quickstart/checkout.md)

---

## Choosing the Right Integration

| Use Case | Recommended Method |
|----------|-------------------|
| Building a custom payment UI | Direct SDK |
| Quick integration in React app | React Button |
| AI agent monetization | Checkout Page Links |
| Maximum flexibility | Direct SDK |
| Minimal code changes | React Button or Checkout Links |
| No frontend available | Checkout Page Links |

## Next Steps

1. **Learn the Protocol:** Start with [What is Tributary?](./what.md) to understand the fundamentals
2. **Choose Your Integration:** Review the quickstart guides above
3. **Explore Payment Types:** Learn about [subscriptions](./subscription-payments.md), [milestones](./milestone-payments.md), and [pay-as-you-go](./pay-as-you-go.md)
4. **Build Something:** Check out our [use cases](./use-cases.md) for inspiration

## Need Help?

- 📖 Read the full [SDK Reference](./sdks.md)
- ❓ Check our [FAQ](./faq.md)
- 💬 Join our community on [Discord](https://discord.gg/tributary)

!!! warning "🏗️ Work in Progress"
    Tributary is under active development and interfaces may change at any time.
