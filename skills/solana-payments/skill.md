---
name: lando-payments
description: >-
  Create Lando checkout URLs for USDC subscription payments on Solana. Guide
  users through interactive session creation, parameter extraction, code
  generation, and validation.
---
# Lando Payments URL Creation

This skill guides Claude through helping users create Lando checkout URLs using the Tributary Payments SDK. The skill handles requirement gathering, parameter validation, code generation, and execution assistance.

## When to Use

Trigger this skill when users need to:

- Create checkout URLs for USDC payments on Solana
- Set up subscription payment flows with Lando/Tributary
- Generate encoded payment URLs with subscription parameters
- Integrate Lando's hosted checkout into their application
- Test or troubleshoot Tributary payment integration

**Key phrases that trigger this skill:**

- "create a Lando checkout URL"
- "set up Tributary subscription"
- "generate payment link with Lando"
- "integrate Lando payments"
- "USDC subscription on Solana"

## Claude's Workflow

Follow these steps in order. Adapt based on user's technical level and what information they've already provided.

### Step 1: Gather Requirements

Start by understanding what the user needs. Not all parameters are needed up front - guide them conversationally.

**Essential information to collect:**

1. **Subscription amount**: How much per billing cycle? (in USD)
2. **Payment frequency**: Daily, weekly, monthly, or annually?
3. **Recipient wallet**: Solana public key to receive payments
4. **Description**: What is the subscription for?

**Optional information (use sensible defaults if not provided):**

1. Success/cancel URLs (default to example URLs if testing)
2. Tracking ID (generate from user/plan if not provided)
3. Auto-renew preference (default: true for subscriptions)
4. Transaction memo (default: include description)

**Ask conversationally:**

```
To create your Lando checkout URL, I need a few details:

1. What's the subscription amount? (e.g., $20 per month)
2. How often should payments occur? (daily/weekly/monthly/annually)
3. What's your Solana wallet address to receive payments?
4. What's this subscription for? (for the line item description)
```

**Adapt to context:**

- If user says "monthly subscription for $20", extract amount and frequency
- If they mention "premium plan", ask what that means in terms of price
- If they're testing, offer to use placeholder values
- For non-technical users, explain each field simply

### Step 2: Validate Input

Before generating code, validate all parameters:

**Validation checklist:**

- ✅ Amount is positive number (e.g., 20.0, not -5 or 0)
- ✅ Frequency is one of: daily, weekly, monthly, annually
- ✅ Recipient looks like valid Solana address (44 character base58 string)
- ✅ Description is present and meaningful
- ✅ URLs (if provided) start with https://

**Handle validation failures gracefully:**

```
I notice the recipient address looks incomplete - Solana addresses are typically 44 characters long. Could you double-check the wallet address?
```

**If user doesn't know values:**

- Offer to use test/placeholder values
- Explain what each parameter does
- Suggest looking up info in their Solana wallet

### Step 3: Check Environment

Determine if user wants to execute code or just get the implementation:

**Ask about their environment:**

```
Would you like me to:
1. Generate code you can run in your project
2. Execute it here if you have the SDK installed
```

**If executing here:**

- Check if Node.js is available: `which node`
- Check if package is installed: `ls node_modules/@tributary-so/payments` or offer to install
- Validate import works before running

**If generating for user:**

- Create complete standalone file
- Include installation instructions
- Add comments explaining each section

### Step 4: Generate Implementation

Create clean, production-ready code with all gathered parameters.

**Code generation checklist:**

- ✅ Import CheckoutSessionManager correctly
- ✅ Use exact gateway key: `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr`
- ✅ Use USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- ✅ Set base URL: `https://lando.tributary.so/#`
- ✅ Include all required tributaryConfig fields
- ✅ Add try-catch error handling
- ✅ Log final URL clearly

**Template structure:**

```typescript
import { CheckoutSessionManager } from "@tributary-so/payments";

async function createCheckout() {
  const manager = new CheckoutSessionManager();
  manager.setBaseUrl("https://lando.tributary.so/#");

  try {
    const session = await manager.create({
      payment_method_types: ["tributary"],
      line_items: [
        {
          description: "[USER_DESCRIPTION]",
          unitPrice: [USER_AMOUNT],
          quantity: 1,
        },
      ],
      paymentFrequency: "[USER_FREQUENCY]",
      mode: "subscription",
      success_url: "[USER_SUCCESS_URL]",
      cancel_url: "[USER_CANCEL_URL]",
      tributaryConfig: {
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
        recipient: "[USER_RECIPIENT]",
        trackingId: "[GENERATED_OR_USER_TRACKING_ID]",
        autoRenew: true,
        memo: "[USER_MEMO]",
      },
    });

    console.log("Checkout URL:", session.url);
    return session.url;
  } catch (error) {
    console.error("Error creating checkout:", error.message);
    throw error;
  }
}

createCheckout();
```

**Replace placeholders with actual values:**

- `[USER_DESCRIPTION]` → e.g., "Premium monthly subscription"
- `[USER_AMOUNT]` → e.g., 20.0
- `[USER_FREQUENCY]` → e.g., "monthly"
- `[USER_RECIPIENT]` → user's Solana address
- `[GENERATED_OR_USER_TRACKING_ID]` → generate as `user_[timestamp]_[description_slug]`

### Step 5: Execute or Deliver

**If executing in environment:**

1. Save code to `/home/claude/lando-checkout.ts`
2. Run with: `npx tsx lando-checkout.ts` (or node if JS)
3. Capture and display the checkout URL
4. Validate URL format (should start with `https://lando.tributary.so/#/subscribe/`)

**If delivering to user:**

1. Create file in `/mnt/user-data/outputs/lando-checkout.ts`
2. Include installation instructions at top of file as comments
3. Use present_files tool to share with user
4. Provide clear next steps

### Step 6: Provide Next Steps

After generating URL or code, tell user what to do next:

**If URL was generated:**

```
Your checkout URL is ready:
[URL]

Next steps:
1. Test the URL in your browser (it will load the Lando checkout page)
2. Integrate this URL generation into your application
3. Replace the example success/cancel URLs with your actual endpoints
4. Share the URL with customers to complete subscription setup
```

**If code was provided:**

```
I've created a TypeScript file with your checkout configuration.

To use it:
1. Install the SDK: npm install @tributary-so/payments
2. Run the script: npx tsx lando-checkout.ts
3. Copy the generated URL to use in your application

The URL will be valid for your customers to complete their subscription.
```

**Offer follow-up help:**

- Testing the URL
- Handling the success callback
- Checking subscription status
- Troubleshooting issues

## Technical Reference

### Required SDK

```bash
npm install @tributary-so/payments
```

### Core API

**CheckoutSessionManager.create() parameters:**

```typescript
{
  payment_method_types: ["tributary"],  // Always "tributary"
  line_items: [{
    description: string,    // Subscription description
    unitPrice: number,      // Amount in USD (e.g., 20.0)
    quantity: number,       // Usually 1
  }],
  paymentFrequency: "daily" | "weekly" | "monthly" | "annually",
  mode: "subscription",     // Always "subscription"
  success_url: string,      // Redirect after payment success
  cancel_url: string,       // Redirect if user cancels
  tributaryConfig: {
    tokenMint: string,      // USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    gateway: string,        // MUST BE: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"
    recipient: string,      // User's Solana public key (base58)
    trackingId: string,     // Unique identifier per subscription
    autoRenew?: boolean,    // Default: false (recommend true for subscriptions)
    memo?: string,          // Optional transaction memo
  },
  metadata?: Record<string, string>,  // Optional
}
```

### Critical Constants

**NEVER change these values - they are required for Lando to work:**

```typescript
// USDC token mint on Solana mainnet
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Lando gateway - enables automatic renewal processing
const LANDO_GATEWAY = "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr";

// Base URL for checkout pages
const BASE_URL = "https://lando.tributary.so/#";
```

### Response Structure

```typescript
{
  id: string,                          // Format: cs_[timestamp]_[random]
  object: "checkout.session",
  url: string,                         // Full checkout URL with encoded params
  payment_status: "unpaid",
  status: "open",
  amount_total: number,                // Total USD amount
  currency: "usd",
  payment_method_types: ["tributary"],
  line_items: [...],
  mode: "subscription",
  success_url?: string,
  cancel_url?: string,
  tributaryConfig?: {...},
  metadata?: {...},
}
```

### URL Format

Generated URLs follow this pattern:

```
https://lando.tributary.so/#/subscribe/[base64-encoded-parameters]
```

The encoded data contains all subscription configuration in a compact format.

## Common Patterns

### Pattern 1: Simple Monthly Subscription

User wants basic monthly subscription with minimal configuration.

**User says:** "I need a $20/month subscription link for premium access"

**Claude should:**

1. Extract: $20, monthly, "premium access"
2. Ask for recipient wallet
3. Generate tracking ID: `user_${Date.now()}_premium_monthly`
4. Use defaults for success/cancel URLs (or ask if integrating)
5. Create implementation with these values

### Pattern 2: Multiple Line Items

User wants bundled subscription with multiple items.

**Code pattern:**

```typescript
line_items: [
  { description: "Basic Plan", unitPrice: 10.0, quantity: 1 },
  { description: "Additional Feature A", unitPrice: 5.0, quantity: 1 },
  { description: "Additional Feature B", unitPrice: 5.0, quantity: 1 },
];
// Total: $20.00/month
```

**Note:** Total is calculated automatically from all line items.

### Pattern 3: Testing/Development

User wants to test the flow without real values.

**Claude should:**

1. Offer placeholder recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" (example)
2. Use simple success_url: "<https://example.com/success?session_id={CHECKOUT_SESSION_ID}>"
3. Use simple cancel_url: "<https://example.com/cancel>"
4. Generate test tracking ID
5. Explain that URL will work but payments go to placeholder address

### Pattern 4: Custom Tracking IDs

User wants specific tracking format for their system.

**Good tracking ID patterns:**

- `user_${userId}_${planType}_${timestamp}` - Most unique
- `subscription_${userId}_${planId}` - Simpler but must be unique
- `tenant_${tenantId}_plan_${planId}_${date}` - Multi-tenant apps

**Avoid:**

- Static strings: "premium_subscription" (not unique)
- User input only: "john_doe" (conflicts possible)

### Pattern 5: Integration into Existing App

User wants to integrate into their codebase.

**Claude should:**

1. Ask about their stack (React, Node, etc.)
2. Provide function they can import
3. Show example of calling it from their code
4. Include TypeScript types if they use TS
5. Explain success URL callback handling

**Example wrapper:**

```typescript
export async function createSubscriptionCheckout(
  amount: number,
  frequency: "daily" | "weekly" | "monthly" | "annually",
  recipientWallet: string,
  description: string
): Promise<string> {
  const manager = new CheckoutSessionManager();
  manager.setBaseUrl("https://lando.tributary.so/#");

  const session = await manager.create({
    // ... configuration
  });

  return session.url;
}
```

## Error Handling

### Common Errors and Solutions

**Error: "Invalid recipient public key"**

- Cause: Recipient is not valid base58 or wrong length
- Solution: Validate recipient is 44 characters, base58 encoded
- Tell user: "The Solana wallet address should be 44 characters. Could you double-check it?"

**Error: "Invalid trackingId format"**

- Cause: Tracking ID contains invalid characters or is too long
- Solution: Use alphanumeric + underscores only, keep under 100 chars
- Tell user: "Let me generate a valid tracking ID for you."

**Error: "Missing required fields"**

- Cause: tributaryConfig missing required fields
- Solution: Ensure tokenMint, gateway, recipient, trackingId all present
- Tell user: "I need your Solana wallet address to complete the setup."

**Error: "Invalid amount"**

- Cause: unitPrice is negative, zero, or not a number
- Solution: Validate amount > 0 before generating code
- Tell user: "The subscription amount should be a positive number like 20.0."

### Validation Before Execution

Always validate these before running code:

```typescript
function validate(params) {
  const errors = [];

  // Amount
  if (!params.amount || params.amount <= 0) {
    errors.push("Amount must be positive");
  }

  // Frequency
  const validFreqs = ["daily", "weekly", "monthly", "annually"];
  if (!validFreqs.includes(params.frequency)) {
    errors.push("Frequency must be daily, weekly, monthly, or annually");
  }

  // Recipient (basic check)
  if (!params.recipient || params.recipient.length !== 44) {
    errors.push("Recipient must be valid Solana address (44 chars)");
  }

  // Description
  if (!params.description || params.description.trim().length === 0) {
    errors.push("Description is required");
  }

  return errors;
}
```

If validation fails, explain the issue and ask for corrected values.

## Best Practices for Claude

### 1. Be Conversational

Don't interrogate users with a form-like list. Have a natural conversation:

❌ Bad:

```
I need the following information:
1. Amount
2. Frequency
3. Recipient
4. Description
```

✅ Good:

```
I can help you create a Lando checkout URL! What amount would you like to charge per billing cycle?
```

Then continue conversationally based on their response.

### 2. Provide Context

Explain WHY you need information, especially for non-technical users:

```
I'll need your Solana wallet address - this is where the USDC subscription payments will be sent. It's a 44-character string starting with a letter or number.
```

### 3. Offer Defaults and Examples

Reduce user burden by suggesting reasonable defaults:

```
For testing, I can use example URLs:
- Success: https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}
- Cancel: https://yourapp.com/cancel

Or would you like to provide your actual URLs?
```

### 4. Validate Early

Check values as you collect them, not all at the end:

```
I see you entered "$20/month" - I'll use $20.00 as the amount and monthly as the frequency. Does that look right?
```

### 5. Show the URL Clearly

When URL is generated, make it obvious:

```
✅ Your checkout URL is ready:

https://lando.tributary.so/#/subscribe/eyJ0bSI6IkVQakZXZ...

Copy this URL and share it with your customers. When they visit it, they'll see the Lando checkout page for your subscription.
```

### 6. Provide Next Steps

Always end with clear action items:

```
What would you like to do next?
- Test the URL in your browser
- See example code for handling the success callback
- Create additional checkout URLs with different amounts
- Learn about checking subscription status
```

### 7. Handle Uncertainty Gracefully

If user's request is ambiguous, confirm your understanding:

```
Just to confirm - you want to create a monthly subscription for $20 that will charge customers' wallets automatically each month. Is that correct?
```

## Troubleshooting Guide

### Issue: URL doesn't load checkout page

**Check:**

1. URL starts with `https://lando.tributary.so/#/subscribe/`
2. Encoded data is valid base64url
3. All required parameters were included

**Debug:**

```typescript
console.log("Generated session:", JSON.stringify(session, null, 2));
console.log("URL:", session.url);
```

### Issue: Payments not processing

**Check:**

1. Gateway is exactly: `CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr`
2. Recipient wallet is valid and accessible
3. Token mint is USDC mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
4. User has USDC in their wallet

**Not a code issue if:** User doesn't have USDC or hasn't approved transaction

### Issue: Tracking ID conflicts

**Solution:** Ensure tracking IDs are globally unique:

```typescript
// Good: includes timestamp
const trackingId = `user_${userId}_${planId}_${Date.now()}`;

// Also good: includes random component
const trackingId = `sub_${userId}_${Math.random().toString(36).substring(7)}`;
```

### Issue: Success URL not working

**Check:**

1. URL is complete: `https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}`
2. Placeholder `{CHECKOUT_SESSION_ID}` is included (Lando replaces it)
3. Your server handles the success callback endpoint

## Related Resources

- **Tributary SDK**: `@tributary-so/sdk` - For on-chain operations and subscription management
- **Payments SDK**: `@tributary-so/payments` - Checkout session creation (this skill)
- **Subscription Status**: Use `client.subscriptions.checkStatus(trackingId)` to verify active subscriptions

## Examples of Claude's Responses

### Example 1: User has all info

**User:** "Create a checkout URL for $50/month premium plan, recipient is 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

**Claude:**

```
I'll create a Lando checkout URL for a $50/month premium subscription.

[generates and executes code]

✅ Your checkout URL is ready:
https://lando.tributary.so/#/subscribe/eyJ0bSI6...

This URL will allow customers to subscribe to your premium plan for $50/month with automatic USDC payments.
```

### Example 2: User needs guidance

**User:** "I want to accept crypto payments for my SaaS"

**Claude:**

```
I can help you set up recurring USDC payments on Solana using Lando!

A few questions:
1. How much would you like to charge per billing cycle?
2. How often: daily, weekly, monthly, or annually?
3. What's your Solana wallet address? (This is where payments will be sent)

Once I have these details, I'll generate a checkout URL you can share with customers.
```

### Example 3: Technical integration

**User:** "I need to integrate this into my Next.js app"

**Claude:**

```
Perfect! I'll create a TypeScript function you can add to your Next.js app.

[creates file with function]

To use it in your app:

1. Install the SDK:
   npm install @tributary-so/payments

2. Import the function:
   import { createSubscriptionCheckout } from './lando-checkout'

3. Call it when needed:
   const url = await createSubscriptionCheckout(20, "monthly", recipientWallet, "Premium Plan");
   router.push(url);

The function returns the checkout URL which you can redirect users to or display as a payment link.
```

## Summary Checklist

Before considering the task complete, verify:

- ✅ All required parameters collected
- ✅ Values validated (amount > 0, valid frequency, etc.)
- ✅ Gateway constant is correct (`CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr`)
- ✅ USDC mint is correct (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- ✅ Code includes error handling
- ✅ URL generated or code file created
- ✅ Next steps provided to user
- ✅ User knows how to test/use the URL

Success means user has either a working checkout URL or code that will generate one when they run it.

