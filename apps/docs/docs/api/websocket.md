# WebSocket API

Real-time payment notifications via Socket.IO.

> WebSocket events are documented inline below. The REST API is documented via
> OpenAPI at [REST API](rest-api.md).

**Endpoint:** `wss://api.tributary.so/ws/v1`

## Connection

### Basic Connection

```typescript
import { io } from "socket.io-client";

const socket = io("https://api.tributary.so", {
  path: "/ws/v1",
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Connected to WebSocket");
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket");
});
```

### React Example

```typescript
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function PaymentNotifier({ trackingId }: { trackingId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const socketInstance = io("https://api.tributary.so", {
      path: "/ws/v1",
      transports: ["websocket"],
    });

    socketInstance.emit("subscribe", { trackingId });

    socketInstance.on("payment", (message) => {
      console.log("Payment received:", message.data);
      setPayments((prev) => [...prev, message.data]);
    });

    socketInstance.on("ack", (message) => {
      console.log("Ack:", message.data);
    });

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
    <div>
      <h3>Payments: {payments.length}</h3>
      <ul>
        {payments.map((payment, i) => (
          <li key={i}>
            {payment.amount} at{" "}
            {new Date(payment.timestamp * 1000).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Client-to-Server Events

| Event         | Payload                  | Description                            |
| ------------- | ------------------------ | -------------------------------------- |
| `subscribe`   | `{ trackingId: string }` | Subscribe to payment notifications     |
| `unsubscribe` | `{ trackingId: string }` | Unsubscribe from payment notifications |

```typescript
socket.emit("subscribe", { trackingId: "my-subscription-id" });
socket.emit("unsubscribe", { trackingId: "my-subscription-id" });
```

## Server-to-Client Events

### `payment`

Payment notification received.

```json
{
  "type": "payment_notification",
  "data": {
    "trackingId": "my-subscription-id",
    "amount": 1000000,
    "timestamp": 1699876543,
    "status": "executed",
    "signature": "TransactionSignature"
  },
  "timestamp": 1699876543210
}
```

### `ack`

Acknowledgment message.

```json
{
  "type": "ack",
  "data": "Subscribed to trackingId: my-subscription-id",
  "timestamp": 1699876543210
}
```

### `error`

Error message.

```json
{
  "type": "error",
  "data": {
    "code": "INVALID_TRACKING_ID",
    "message": "Tracking ID is required and must be a string"
  },
  "timestamp": 1699876543210
}
```

## Error Codes

| Code                  | Description                                  |
| --------------------- | -------------------------------------------- |
| `INVALID_TRACKING_ID` | Tracking ID is required and must be a string |
| `CONNECTION_ERROR`    | WebSocket connection error                   |

## Connection Management

### Reconnection

Socket.IO automatically handles reconnection. Configure reconnection options:

```typescript
const socket = io("https://api.tributary.so", {
  path: "/ws/v1",
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

### Connection State

```typescript
socket.on("connect", () => {
  console.log("Connected:", socket.connected);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);

  if (reason === "io server disconnect") {
    // Reconnect manually if server disconnected
    socket.connect();
  }
});
```

## Production Considerations

### Multiple Subscriptions

Subscribe to multiple tracking IDs:

```typescript
const trackingIds = ["sub-1", "sub-2", "sub-3"];

trackingIds.forEach((id) => {
  socket.emit("subscribe", { trackingId: id });
});
```

### Error Handling

```typescript
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);

  // Implement retry logic or fallback
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
```

### Cleanup

Always cleanup connections when unmounting components:

```typescript
useEffect(() => {
  const socket = io("https://api.tributary.so", {
    path: "/ws/v1",
  });

  // ... setup listeners ...

  return () => {
    socket.emit("unsubscribe", { trackingId });
    socket.disconnect();
  };
}, [trackingId]);
```

## Scaling

For multi-server deployments, the WebSocket uses a Redis adapter to distribute
messages across instances. No client-side changes needed.

## Next Steps

- [REST API](rest-api.md) — Complete REST endpoint reference (OpenAPI)
- [Examples](examples.md) — More code examples
