import "dotenv/config";
/**
 * Tributary API
 * Modular Express API for subscription and payment services
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import { requestLogger, errorHandler, notFoundHandler } from "./middleware";

import { WebSocketService } from "./services/websocket";
import { KafkaPaymentConsumer } from "./services/kafkaConsumer";

import apiRoutes from "./routes";
import jwksRouter from "./routes/jwks";
import { startAutoRotationCheck } from "./services/jwks";
import { openapiSpec } from "./openapi";

const app: express.Express = express();
const PORT = process.env.PORT || "3002";
const REDIS_URL = process.env.REDIS_URL;
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(",") || [];

// Global middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API routes with /v1 prefix
app.use("/v1", apiRoutes);

app.use("/.well-known/jwks.json", jwksRouter);

// OpenAPI spec — JSON, YAML, and Swagger UI.
// The checked-in apps/api/openapi.yaml is regenerated from /openapi.yaml.
app.get("/openapi.json", (_req, res) => {
  res.json(openapiSpec);
});
app.get("/openapi.yaml", (_req, res) => {
  res.type("text/yaml").send(yaml.dump(openapiSpec));
});
// Cast — @types/swagger-ui-express and @types/express v4 disagree on the
// RequestHandler signature. Runtime is fine; this is purely a types clash.
app.use(
  "/docs",
  ...(swaggerUi.serve as any),
  swaggerUi.setup(openapiSpec) as any
);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Tributary API",
    version: "1.0.0",
    status: "running",
    // endpoints: {
    //   health: "/v1/health",
    //   skill: "/v1/skill/:encoded",
    //   subscriptionDetails: "/v1/subscriptions/",
    //   onetimePayment: "/v1/onetime/:trackingId",
    //   events: "/v1/events",
    //   tributaryEventNames: "/v1/events/names/tributary",
    //   payments: "/v1/events/payments",
    //   paymentStats: "/v1/events/payments/stats",
    //   policiesCreated: "/v1/events/policies/created",
    //   policiesDeleted: "/v1/events/policies/deleted",
    //   policyStatusChanged: "/v1/events/policies/status-changed",
    //   gatewaysCreated: "/v1/events/gateways/created",
    //   gatewaysDeleted: "/v1/events/gateways/deleted",
    //   gatewayFeeBpsChanged: "/v1/events/gateways/fee-bps-changed",
    //   gatewayFeeRecipientChanged: "/v1/events/gateways/fee-recipient-changed",
    //   gatewaySignerChanged: "/v1/events/gateways/signer-changed",
    //   referralRewards: "/v1/events/referrals/rewards",
    //   userPaymentsCreated: "/v1/events/user-payments/created",
    //   webhooks: "/v1/webhooks",
    //   webhooksByGateway: "/v1/webhooks/gateway/:gatewayPubkey",
    //   webhookById: "/v1/webhooks/:id",
    // },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

let wsService: WebSocketService | null = null;
let kafkaConsumer: KafkaPaymentConsumer | null = null;

// Start server
if (require.main === module) {
  const httpServer = createServer(app);

  wsService = new WebSocketService(httpServer, REDIS_URL);

  startAutoRotationCheck();

  if (KAFKA_BROKERS.length > 0) {
    const consumer = new KafkaPaymentConsumer(KAFKA_BROKERS);
    kafkaConsumer = consumer;

    consumer
      .connect()
      .then(() => consumer.start())
      .catch((error) => {
        console.error("Failed to start Kafka consumer:", error);
        console.log("Continuing without Kafka integration");
      });
  } else {
    console.log("No KAFKA_BROKERS configured, skipping Kafka consumer startup");
  }

  httpServer.listen(PORT, () => {
    console.log(`Tributary API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/v1/health`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws/v1`);
    if (KAFKA_BROKERS.length > 0) {
      console.log(`Kafka consumer: ${KAFKA_BROKERS.join(", ")}`);
    }
  });
}

export default app;
export { wsService };
export { kafkaConsumer as kafkaPaymentConsumer };
