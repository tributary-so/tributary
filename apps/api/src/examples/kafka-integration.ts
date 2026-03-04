import { notifyPayment } from "../services/paymentNotifications";
import { PaymentNotificationData } from "../types";

/**
 * Example: Kafka Payment Event Handler
 *
 * This example shows how to integrate WebSocket notifications
 * with a Kafka consumer that receives payment events.
 *
 * When you set up Kafka integration:
 * 1. Create a Kafka consumer for payment events
 * 2. Transform Kafka messages to PaymentNotificationData format
 * 3. Call notifyPayment() to broadcast to connected WebSocket clients
 */

// Example payment event from Kafka
interface KafkaPaymentEvent {
  trackingId: string;
  amount: string;
  timestamp: number;
  status: "executed" | "failed" | "pending";
  signature?: string;
}

// Example Kafka message handler
export function handleKafkaPaymentEvent(event: KafkaPaymentEvent): void {
  const notification: PaymentNotificationData = {
    trackingId: event.trackingId,
    amount: parseFloat(event.amount),
    status: event.status,
    signature: event.signature,
    timestamp: event.timestamp,
  };

  notifyPayment(notification);
}

// Example usage in Kafka consumer setup:
/*
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'tributary-api',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'payment-notifications' });

async function startPaymentConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'payments', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value?.toString() || '{}');
      handleKafkaPaymentEvent(event);
    },
  });
}

startPaymentConsumer().catch(console.error);
*/
