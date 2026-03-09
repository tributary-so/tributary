# API Examples

Practical examples for integrating with the Tributary API.

## Subscription Status Check

Check the status of a subscription by tracking ID.

```typescript
async function checkSubscriptionStatus(trackingId: string) {
  const response = await fetch(
    `https://api.tributary.so/v1/subscriptions?trackingId=${trackingId}`
  );

  const { success, data, error } = await response.json();

  if (!success) {
    console.error("Error:", error);
    return null;
  }

  return data[0];
}

// Usage
const subscription = await checkSubscriptionStatus("my-subscription");

if (subscription) {
  console.log("Subscription found:");
  console.log("- Recipient:", subscription.recipient);
  console.log("- Policy Type:", subscription.policyType);
  console.log(
    "- Next Payment:",
    new Date(subscription.policyType.subscription.nextPaymentDue * 1000)
  );
  console.log("- Total Paid:", subscription.totalPaid);
}
```

## One-Time Payment Verification

Verify if a one-time payment has been received.

```typescript
async function verifyPayment(trackingId: string) {
  const response = await fetch(
    `https://api.tributary.so/v1/onetime/${trackingId}`
  );

  const { success, data, error } = await response.json();

  if (!success) {
    console.error("Error:", error);
    return null;
  }

  return data;
}

// Usage
const payment = await verifyPayment("order-12345");

if (payment) {
  console.log("Payment received:");
  console.log("- Amount:", payment.amount);
  console.log("- Signature:", payment.signature);
  console.log("- Timestamp:", payment.timestamp);
  console.log("- Status: Success");
} else {
  console.log("Payment not found or pending");
}
```

## Real-Time Payment Notifications with React

Complete React component for real-time payment monitoring.

```typescript
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Payment {
  trackingId: string;
  amount: number;
  timestamp: number;
  status: string;
  signature: string;
}

export function PaymentMonitor({ trackingId }: { trackingId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const socketInstance = io("https://api.tributary.so", {
      path: "/ws/v1",
      transports: ["websocket"],
    });

    // Connection state
    socketInstance.on("connect", () => {
      console.log("Connected to Tributary WebSocket");
      setConnected(true);
      socketInstance.emit("subscribe", { trackingId });
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from Tributary WebSocket");
      setConnected(false);
    });

    // Payment notifications
    socketInstance.on("payment", (message) => {
      console.log("Payment received:", message.data);
      setPayments((prev) => [...prev, message.data]);
    });

    // Acknowledgments
    socketInstance.on("ack", (message) => {
      console.log("Ack:", message.data);
    });

    // Errors
    socketInstance.on("error", (message) => {
      console.error("Error:", message.data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit("unsubscribe", { trackingId });
      socketInstance.disconnect();
    };
  }, [trackingId]);

  return (
    <div className="payment-monitor">
      <div className="status">
        Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}
      </div>

      <h3>Payments ({payments.length})</h3>

      {payments.length === 0 ? (
        <p>Waiting for payments...</p>
      ) : (
        <table className="payments-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Time</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, i) => (
              <tr key={i}>
                <td>{payment.amount.toLocaleString()}</td>
                <td>{payment.status}</td>
                <td>{new Date(payment.timestamp * 1000).toLocaleString()}</td>
                <td>
                  <a
                    href={`https://solscan.io/tx/${payment.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

## Event Query with Pagination

Query payment events with pagination for large datasets.

```typescript
async function getPaymentHistory(
  trackingId: string,
  limit: number = 100,
  offset: number = 0
) {
  const params = new URLSearchParams({
    trackingId,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`https://api.tributary.so/v1/events?${params}`);

  const events = await response.json();
  return events;
}

// Load all payments in batches
async function getAllPayments(trackingId: string) {
  const batchSize = 100;
  let offset = 0;
  let allPayments = [];

  while (true) {
    const events = await getPaymentHistory(trackingId, batchSize, offset);

    if (events.length === 0) break;

    allPayments = [...allPayments, ...events];
    offset += batchSize;

    console.log(`Loaded ${allPayments.length} payments...`);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return allPayments;
}

// Usage
const payments = await getAllPayments("my-subscription");
console.log(`Total payments: ${payments.length}`);
```

## Gateway Statistics

Get payment statistics for a specific gateway.

```typescript
async function getGatewayStats(gatewayPubkey: string) {
  // Get total payment count
  const countResponse = await fetch(
    `https://api.tributary.so/v1/events/payments?gateway=${gatewayPubkey}`
  );
  const payments = await countResponse.json();

  // Get payment stats
  const statsResponse = await fetch(
    `https://api.tributary.so/v1/events/payments/stats?gateway=${gatewayPubkey}`
  );
  const stats = await statsResponse.json();

  return {
    totalPayments: payments.length,
    ...stats,
  };
}

// Usage
const stats = await getGatewayStats(
  "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4"
);

console.log("Gateway Statistics:");
console.log("- Total Payments:", stats.totalPayments);
console.log("- Total Amount:", stats.totalAmount);
console.log("- Average Payment:", stats.averagePayment);
```

## Webhook Registration

Register a webhook to receive payment notifications via HTTP POST.

```typescript
async function registerWebhook(gatewayPubkey: string, endpointUrl: string) {
  const response = await fetch("https://api.tributary.so/v1/webhooks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gateway_pubkey: gatewayPubkey,
      endpoint_url: endpointUrl,
      active: true,
    }),
  });

  const webhook = await response.json();
  return webhook;
}

// Usage
const webhook = await registerWebhook(
  "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
  "https://your-server.com/webhooks/tributary"
);

console.log("Webhook registered:", webhook.id);
```

## Webhook Handler (Node.js/Express)

Handle incoming webhook notifications.

```typescript
import express from "express";

const app = express();

app.use(express.json());

app.post("/webhooks/tributary", (req, res) => {
  const { event, data, timestamp } = req.body;

  console.log("Webhook received:");
  console.log("- Event:", event);
  console.log("- Timestamp:", timestamp);
  console.log("- Data:", data);

  // Process the payment notification
  if (event === "tributary_PaymentRecord") {
    const { payment_policy, gateway, amount, memo, signature } = data;

    console.log(`Payment of ${amount} received`);
    console.log(
      `Tracking ID: ${new TextDecoder().decode(new Uint8Array(memo))}`
    );
    console.log(`Transaction: https://solscan.io/tx/${signature}`);

    // Update your database, send confirmation email, etc.
  }

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Webhook server listening on port 3000");
});
```

## Integration with Checkout

Monitor payment completion during checkout.

```typescript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function CheckoutMonitor({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<"pending" | "paid" | "failed">(
    "pending"
  );
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    const socket = io("https://api.tributary.so", {
      path: "/ws/v1",
      transports: ["websocket"],
    });

    socket.emit("subscribe", { trackingId: orderId });

    socket.on("payment", (message) => {
      if (message.data.trackingId === orderId) {
        setPayment(message.data);
        setStatus("paid");
        socket.disconnect();

        // Redirect to success page
        window.location.href = `/success?orderId=${orderId}`;
      }
    });

    socket.on("error", () => {
      setStatus("failed");
      socket.disconnect();
    });

    return () => socket.disconnect();
  }, [orderId]);

  return (
    <div className="checkout-status">
      {status === "pending" && <p>Waiting for payment...</p>}
      {status === "paid" && <p>✅ Payment received!</p>}
      {status === "failed" && <p>❌ Payment failed or timeout</p>}
    </div>
  );
}
```

## Next.js Server Action Example

```typescript
"use server";

import { Tributary } from "@tributary-so/sdk";

export async function getSubscriptionStatus(trackingId: string) {
  const tributary = new Tributary({
    apiUrl: "https://api.tributary.so",
  });

  const subscription = await tributary.getSubscription({
    trackingId,
  });

  return subscription;
}

// Usage in component
import { getSubscriptionStatus } from "./actions";

export default async function SubscriptionPage({
  params,
}: {
  params: { id: string };
}) {
  const subscription = await getSubscriptionStatus(params.id);

  if (!subscription) {
    return <div>Subscription not found</div>;
  }

  return (
    <div>
      <h1>Subscription: {subscription.memo}</h1>
      <p>Status: {subscription.policyType}</p>
      <p>Total Paid: {subscription.totalPaid}</p>
    </div>
  );
}
```

## Error Handling

Robust error handling for API requests.

```typescript
async function safeApiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "API error");
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error("API call failed:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Usage
const { data, error } = await safeApiCall(
  "https://api.tributary.so/v1/subscriptions?trackingId=my-subscription"
);

if (error) {
  console.error("Failed to fetch subscription:", error);
} else {
  console.log("Subscription:", data);
}
```

## Next Steps

- [API Overview](./overview.md) - Getting started guide
- [REST API Reference](./rest-api.md) - Complete endpoint documentation
- [WebSocket API](./websocket.md) - Real-time notifications
