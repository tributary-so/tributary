import { Kafka, EachMessagePayload } from "kafkajs";
import { notifyPayment } from "./paymentNotifications";
import { PaymentNotificationData } from "../types";
import { decodeMemo } from "@tributary-so/sdk";
import { WebhookService } from "./webhookForwarder";

interface KafkaPaymentRecordEvent {
  _id: string;
  slot: number;
  signature: string;
  program_id: string;
  event_name: string;
  discriminator: string;
  data: {
    payment_policy: string;
    gateway: string;
    amount: string;
    timestamp: number;
    memo: number[];
    record_id: number;
  };
  timestamp: string;
}

export class KafkaPaymentConsumer {
  private kafka: Kafka;
  private consumer: any;
  private groupId: string;
  private topic: string;
  private isConnected: boolean = false;

  constructor(brokers: string[], groupId: string = "tributary-api-payments") {
    this.kafka = new Kafka({
      clientId: "tributary-api",
      brokers: brokers,
    });
    this.groupId = groupId;
    this.topic = "tributary_PaymentRecord";
  }

  async connect(): Promise<void> {
    try {
      this.consumer = this.kafka.consumer({ groupId: this.groupId });
      await this.consumer.connect();
      console.log(`Kafka consumer connected to brokers`);

      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });
      console.log(`Subscribed to Kafka topic: ${this.topic}`);

      this.isConnected = true;
    } catch (error) {
      console.error("Failed to connect Kafka consumer:", error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Kafka consumer not connected. Call connect() first.");
    }

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await this.handleMessage(payload);
        } catch (error) {
          console.error("Error processing Kafka message:", error);
        }
      },
    });

    console.log("Kafka payment consumer started and listening for messages");
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    if (!message.value) {
      console.warn("Received empty Kafka message");
      return;
    }

    try {
      const event: KafkaPaymentRecordEvent = JSON.parse(
        message.value.toString()
      );

      if (event.event_name !== "PaymentRecord") {
        return;
      }

      console.log(
        `Processing PaymentRecord: amount=${event.data.amount}, signature=${event.signature}`
      );

      const trackingId = this.extractTrackingIdFromMemo(event.data.memo);

      if (!trackingId) {
        console.warn(
          `No trackingId found in memo for payment: ${event.signature}`
        );
        return;
      }

      const notification: PaymentNotificationData = {
        trackingId,
        amount: parseInt(event.data.amount, 10),
        timestamp: event.data.timestamp,
        status: "executed",
        signature: event.signature,
      };

      notifyPayment(notification);

      console.log(
        `Payment notification sent for trackingId: ${trackingId}, amount: ${notification.amount}`
      );

      await WebhookService.forwardPaymentRecord(event.data.gateway, {
        payment_policy: event.data.payment_policy,
        gateway: event.data.gateway,
        amount: parseInt(event.data.amount, 10),
        timestamp: event.data.timestamp,
        memo: event.data.memo,
        record_id: event.data.record_id,
      });
    } catch (error) {
      console.error("Error parsing Kafka message:", error);
      console.error("Message value:", message.value?.toString());
    }
  }

  private extractTrackingIdFromMemo(memo: number[] | Buffer): string | null {
    try {
      if (!memo || memo.length === 0) {
        return null;
      }

      const memoArray = Buffer.isBuffer(memo) ? Array.from(memo) : memo;
      const trackingId = decodeMemo(memoArray);

      return trackingId || null;
    } catch (error) {
      console.error("Error decoding memo:", error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.consumer && this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log("Kafka consumer disconnected");
    }
  }

  isConsumerConnected(): boolean {
    return this.isConnected;
  }
}
