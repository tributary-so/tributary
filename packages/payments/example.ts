/**
 * Example usage of @tributary-so/payments package
 *
 * This example demonstrates how to integrate Stripe-compatible payments
 * with Tributary's USDC subscription system on Solana.
 */

import { PaymentsClient } from "./src/index";

async function example() {
  // 1. Initialize the client (no API key required!)
  const stripe = new PaymentsClient();

  // 2. Create a checkout session
  try {
    const session = await stripe.checkout.create({
      payment_method_types: ["tributary"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Premium Subscription",
              description: "Monthly premium access to all features",
            },
            unit_amount: 2000, // $20.00 in cents
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        "https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://yourapp.com/cancel",
      tributaryConfig: {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // Your gateway public key
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // Your recipient public key
        trackingId: "user_123_monthly_premium", // Your unique tracking identifier
        autoRenew: true,
        memo: "Monthly premium subscription payment",
      },
    });

    console.log("Checkout session created:", session.id);
    console.log("Checkout URL:", session.url);

    // 3. Redirect user to checkout (in a real app)
    // window.location.href = session.url;

    // 4. Check payment status (example polling)
    const checkPayment = async () => {
      try {
        const status = await stripe.payments.checkStatus(
          "user_123_monthly_premium",
          "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        );

        console.log("Payment status:", status.status);

        if (status.status === "paid") {
          console.log("Payment completed! Transactions:", status.transactions);
          // Grant access to user, update UI, etc.
        } else {
          console.log("Payment still pending...");
          // Continue polling or show pending status
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    };

    // Start polling every 30 seconds
    const pollInterval = setInterval(checkPayment, 30000);

    // Clean up interval when done
    // clearInterval(pollInterval);
  } catch (error) {
    console.error("Error creating checkout session:", error.message);
  }
}

// Error handling example
async function errorHandlingExample() {
  const stripe = new PaymentsClient();

  try {
    // This will fail due to invalid gateway key
    await stripe.checkout.create({
      payment_method_types: ["tributary"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Test Product" },
            unit_amount: 2000,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      tributaryConfig: {
        gateway: "invalid-gateway-key", // This will cause an error
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "test_tracking_id",
      },
    });
  } catch (error) {
    console.error("Expected error:", error.message);
    // Handle specific error types
    if (error.message.includes("Invalid gateway public key format")) {
      console.log("Please provide a valid Solana public key for the gateway");
    } else if (error.message.includes("Invalid trackingId format")) {
      console.log("Tracking ID must be alphanumeric (max 64 chars)");
    }
  }
}

// Payment history example
async function paymentHistoryExample() {
  const stripe = new PaymentsClient();

  try {
    const history = await stripe.payments.getHistory(
      "user_123_monthly_premium",
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    );

    console.log("Payment history:", history);

    // Process payment history
    history.forEach((payment) => {
      console.log(
        `Payment of ${payment.amount / 1000000} USDC at ${new Date(
          payment.timestamp
        ).toISOString()}`
      );
    });
  } catch (error) {
    console.error("Error getting payment history:", error);
  }
}

// Run examples
if (require.main === module) {
  console.log("=== Tributary Payments SDK Example ===\n");

  console.log("1. Basic checkout session creation:");
  example().catch(console.error);

  console.log("\n2. Error handling example:");
  errorHandlingExample().catch(console.error);

  console.log("\n3. Payment history example:");
  paymentHistoryExample().catch(console.error);
}

export { example, errorHandlingExample, paymentHistoryExample };
