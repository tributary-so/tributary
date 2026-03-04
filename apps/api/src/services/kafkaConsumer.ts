import { Kafka, EachMessagePayload } from "kafkajs";
import { notifyPayment } from "./paymentNotifications";
import { PaymentNotificationData } from "../types";
import { getDb } from "../db";
import { events } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { decodeMemo } from "@tributary-so/sdk";

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

interface PaymentPolicyCreatedEvent {
  user_payment: string;
  recipient: string;
  gateway: string;
  policy_id: number;
  policy_type: any;
  memo: number[];
  created_policies_count: number;
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
        `Processing PaymentRecord: payment_policy=${event.data.payment_policy}, amount=${event.data.amount}`
      );

      const policyInfo = await this.getPolicyInfo(event.data.payment_policy);

      if (!policyInfo) {
        console.warn(
          `No policy info found for payment_policy: ${event.data.payment_policy}`
        );
        return;
      }

      const notification: PaymentNotificationData = {
        trackingId: policyInfo.trackingId,
        policyId: event.data.payment_policy,
        amount: parseInt(event.data.amount, 10),
        tokenMint: policyInfo.tokenMint,
        recipient: policyInfo.recipient,
        timestamp: event.data.timestamp,
        status: "executed",
        signature: event.signature,
      };

      notifyPayment(notification);

      console.log(
        `Payment notification sent for trackingId: ${policyInfo.trackingId}, amount: ${notification.amount}`
      );
    } catch (error) {
      console.error("Error parsing Kafka message:", error);
      console.error("Message value:", message.value?.toString());
    }
  }

  private async getPolicyInfo(
    paymentPolicyPubkey: string
  ): Promise<{
    trackingId: string;
    recipient: string;
    tokenMint: string;
  } | null> {
    try {
      const db = getDb();
      if (!db) {
        console.error("Database not initialized");
        return null;
      }

      const policyCreatedEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.eventName, "PaymentPolicyCreated"),
            sql`${events.data}->>'payment_policy' = ${paymentPolicyPubkey}`
          )
        )
        .orderBy(desc(events.timestamp))
        .limit(1);

      if (policyCreatedEvents.length === 0) {
        console.warn(
          `No PaymentPolicyCreated event found for payment_policy: ${paymentPolicyPubkey}`
        );
        return null;
      }

      const eventData = policyCreatedEvents[0]
        .data as PaymentPolicyCreatedEvent;

      if (!eventData.memo || eventData.memo.length === 0) {
        console.warn(
          `No memo found in PaymentPolicyCreated event for payment_policy: ${paymentPolicyPubkey}`
        );
        return null;
      }

      const trackingId = this.extractTrackingIdFromMemo(eventData.memo);
      if (!trackingId) {
        return null;
      }

      const userPaymentInfo = await this.getUserPaymentInfo(
        eventData.user_payment
      );

      return {
        trackingId,
        recipient: eventData.recipient,
        tokenMint: userPaymentInfo?.tokenMint || "",
      };
    } catch (error) {
      console.error("Error fetching policy info from database:", error);
      return null;
    }
  }

  private async getUserPaymentInfo(
    userPaymentPubkey: string
  ): Promise<{ tokenMint: string } | null> {
    try {
      const db = getDb();
      if (!db) {
        return null;
      }

      const userPaymentEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.eventName, "UserPaymentCreated"),
            sql`${events.data}->>'user_payment' = ${userPaymentPubkey}`
          )
        )
        .orderBy(desc(events.timestamp))
        .limit(1);

      if (userPaymentEvents.length === 0) {
        return null;
      }

      const eventData = userPaymentEvents[0].data as any;
      return {
        tokenMint: eventData.token_mint || "",
      };
    } catch (error) {
      console.error("Error fetching user payment info:", error);
      return null;
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
