/**
 * Tributary API
 * Modular Express API for subscription and payment services
 */

import express from "express";
import cors from "cors";
import { requestLogger, errorHandler, notFoundHandler } from "./middleware";
import apiRoutes from "./routes";

const app = express();
const PORT = process.env.PORT || "3002";

// Global middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API routes with /api/v1 prefix
app.use("/api/v1", apiRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Tributary API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/v1/health",
      skill: "/api/v1/skill/:encoded",
      subscriptionStatus: "/api/v1/subscription/status/:trackingId",
      subscriptionDetails: "/api/v1/subscription/:trackingId",
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Tributary API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  });
}

export default app;
