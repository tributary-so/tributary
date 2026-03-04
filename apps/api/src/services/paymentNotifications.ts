import { PaymentNotificationData } from "../types";
import { WebSocketService } from "./websocket";

export function notifyPayment(notification: PaymentNotificationData): void {
  const wsService = WebSocketService.getInstance();

  if (!wsService) {
    console.warn(
      "WebSocket service not initialized, cannot send payment notification"
    );
    return;
  }

  wsService.broadcastPaymentNotification(notification);
}

export function getWebSocketStats(): {
  activeConnections: number;
  trackingIdStats: { trackingId: string; subscriberCount: number }[];
} {
  const wsService = WebSocketService.getInstance();

  if (!wsService) {
    return {
      activeConnections: 0,
      trackingIdStats: [],
    };
  }

  return {
    activeConnections: wsService.getActiveConnectionsCount(),
    trackingIdStats: [],
  };
}
