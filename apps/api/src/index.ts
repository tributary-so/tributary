import "dotenv/config";
/**
 * Tributary API
 * Modular Express API for subscription and payment services
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { requestLogger, errorHandler, notFoundHandler } from "./middleware";
import apiRoutes from "./routes";
import { WebSocketService } from "./services/websocket";

const app: express.Express = express();
const PORT = process.env.PORT || "3002";
const REDIS_URL = process.env.REDIS_URL;

// Global middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API routes with /api/v1 prefix
app.use("/v1", apiRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Tributary API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/v1/health",
      skill: "/v1/skill/:encoded",
      subscriptionDetails: "/v1/subscriptions/",
      onetimePayment: "/v1/onetime/:trackingId",
      events: "/v1/events",
      tributaryEventNames: "/v1/events/names/tributary",
      payments: "/v1/events/payments",
      paymentStats: "/v1/events/payments/stats",
      policiesCreated: "/v1/events/policies/created",
      policiesDeleted: "/v1/events/policies/deleted",
      policyStatusChanged: "/v1/events/policies/status-changed",
      gatewaysCreated: "/v1/events/gateways/created",
      gatewaysDeleted: "/v1/events/gateways/deleted",
      gatewayFeeBpsChanged: "/v1/events/gateways/fee-bps-changed",
      gatewayFeeRecipientChanged: "/v1/events/gateways/fee-recipient-changed",
      gatewaySignerChanged: "/v1/events/gateways/signer-changed",
      referralRewards: "/v1/events/referrals/rewards",
      userPaymentsCreated: "/v1/events/user-payments/created",
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

let wsService: WebSocketService | null = null;

// Start server
if (require.main === module) {
  const httpServer = createServer(app);

  wsService = new WebSocketService(httpServer, REDIS_URL);

  httpServer.listen(PORT, () => {
    console.log(`Tributary API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/v1/health`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws/v1`);
  });
}

export default app;
export { wsService };
