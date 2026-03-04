/**
 * WebSocket Client Test Script
 *
 * Run this script to test WebSocket payment notifications locally.
 *
 * Prerequisites:
 * 1. Start the API server: pnpm start
 * 2. Install socket.io-client: pnpm add -D socket.io-client
 * 3. Run this test: npx tsx src/examples/websocket-test-client.ts
 */

import { io } from "socket.io-client";

const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:3002";
const TRACKING_ID = process.env.TRACKING_ID || "test-tracking-id-123";

console.log(`Connecting to WebSocket at ${SOCKET_URL}/ws/v1`);

const socket = io(SOCKET_URL, {
  path: "/ws/v1",
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log(`✓ Connected with socket ID: ${socket.id}`);

  console.log(`Subscribing to tracking ID: ${TRACKING_ID}`);
  socket.emit("subscribe", { trackingId: TRACKING_ID });
});

socket.on("ack", (message: any) => {
  console.log("✓ Acknowledgment received:", message.data);
});

socket.on("payment", (message: any) => {
  console.log("💰 Payment notification received:");
  console.log(JSON.stringify(message.data, null, 2));
});

socket.on("error", (message: any) => {
  console.error("✗ Error:", message.data);
});

socket.on("disconnect", (reason: string) => {
  console.log(`Disconnected: ${reason}`);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\nDisconnecting...");
  socket.disconnect();
  process.exit(0);
});

console.log("\nListening for payment notifications...");
console.log("Press Ctrl+C to exit\n");

// Example: Simulate a payment notification after 5 seconds
// (In production, this would come from Kafka or your payment processor)
setTimeout(() => {
  console.log("\n📝 To test payment notifications:");
  console.log(
    "1. Call the notifyPayment() function from your payment processor"
  );
  console.log("2. Or integrate with Kafka to receive real payment events");
  console.log("\nExample code to trigger a test notification:");
  console.log(`
    import { notifyPayment } from './src/services/paymentNotifications';
    
    notifyPayment({
      trackingId: "${TRACKING_ID}",
      amount: 1000000,
      timestamp: Date.now(),
      status: "executed",
      signature: "test-signature"
    });
  `);
}, 5000);
