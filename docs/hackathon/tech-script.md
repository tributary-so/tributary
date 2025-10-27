### 3-Minute Video Script: Tributary - Automated Recurring Payments on Solana

---

[Opening Scene: Quick montage of Web2 subscription flows vs. Web3 manual signing frustrations. Fade to Tributary logo.]

"Hi, I am Fabian and I am excited to present Tributary, the missing infrastructure piece that brings Web2's subscription simplicity to Solana. For too long, the $1.5 trillion subscription economy has been locked out of crypto due to poor UX—users stuck signing transactions every month, funds locked in contracts, and businesses losing revenue from friction. Tributary solves this with automated, non-custodial recurring payments on Solana. Let's dive in."

---

[Cut to demo screen: Start with user connecting wallet.]

"Our core functionality is simple but powerful: users sign once, and payments flow automatically. Watch this demo.

First, a user connects their Solana wallet. They choose a subscription: say, $10 monthly donation to a GitHub repository. With one click, they delegate token authority to our smart contract. No funds move yet — they stay in the user's wallet.

The payment policy is created: amount, frequency, recipient, and payment processor (gateway). That's it. Payments now execute automatically on schedule — directly from the user's token account to the merchant. No more manual approvals!"

---

[Demo visuals: Show policy creation, then simulated payment execution with blockchain confirmation. Highlight 'Active' status and pause/resume controls.]

"Users maintain full control: pause, resume, or cancel anytime. Everything's transparent on Solana's blockchain.

Why build it this way? We prioritized user experience above all. Web2 subscriptions work because they're invisible — users set it and forget it. Tributary replicates that on Solana, but trustlessly. No custodial risks, no fund lock-ups. Users love it; businesses get predictable revenue."

---

[Transition to technical slides: Show Solana integration, token delegation diagram.]

"Major technical decisions: We chose Solana for its speed, sub-cent fees — and native token delegation enabling a Micropayment economy. Unlike Ethereum's complex approvals, Solana's SPL token delegation lets users approve spending authority once, enabling true automation without escrow.

Our smart contracts use Anchor for security and developer experience. Key structures: PaymentPolicy defines the Subscription (amount, frequency, auto-renew), UserPayment tracks per-user/Token stats, and PaymentGateway lets processors earn fees as they execute the payment according to schedule. We built a protocol, not a service — open-source and permissionless."

---

[Show architecture diagram: Protocol layer with gateways building on top.]

"Feature prioritization: We focused on the MVP core—subscription payments with pause/resume/cancel functionality and built this in 3 weeks for this hackathon. Why? Subscriptions are the biggest use case, and getting automation right unlocks everything else. Future PaymentPolicy variants like installments are planned, but we started with what Web2 mastered.

This protocol design lets gateways and processors build businesses on top. They handle onboarding, dashboards, webhooks can can earn fees on volume. We provide the SDK for quick integration: TypeScript libraries, React components, Dev Tooling.

Take contribute.so, our example gateway: it offers recurring donations for GitHub repos or Twitter users (anything that uses OAuth, really). Creators get a Badge with custom link, fans subscribe there with one approval. Payments flow automatically — perfect for content crypto monetization and micro-donations."

---

[Closing visuals: Market stats, team, live demo link.]

"Tributary pioneers automated payments for Web3, tapping a massive market. Built by payment experts. This is the infrastructure Solana needs.

Check tributary.so for docs and demo. Thanks!"

---

[End with call-to-action: QR code to tributary.so, fade out.]
