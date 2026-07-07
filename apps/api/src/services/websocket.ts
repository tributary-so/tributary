import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import {
  WebSocketMessage,
  PaymentNotificationData,
  WebSocketSubscribeData,
  WebSocketErrorData,
} from "../types";

let wsServiceInstance: WebSocketService | null = null;

export class WebSocketService {
  private io: SocketIOServer;
  private trackingIdToSockets: Map<string, Set<string>> = new Map();
  private socketToTrackingIds: Map<string, Set<string>> = new Map();

  constructor(httpServer: HttpServer, redisUrl?: string) {
    this.io = new SocketIOServer(httpServer, {
      path: "/ws/v1",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket"],
    });

    this.setupRedisAdapter(redisUrl);
    this.setupEventHandlers();

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- module-scoped singleton capture, not a local alias
    wsServiceInstance = this;
  }

  public static getInstance(): WebSocketService | null {
    return wsServiceInstance;
  }

  private async setupRedisAdapter(redisUrl?: string): Promise<void> {
    if (redisUrl) {
      try {
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        this.io.adapter(createAdapter(pubClient, subClient));
        console.log("WebSocket Redis adapter connected");
      } catch (error) {
        console.error("Failed to connect Redis adapter for WebSocket:", error);
        console.log("Continuing without Redis adapter (single server mode)");
      }
    }
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      this.socketToTrackingIds.set(socket.id, new Set());

      socket.on("subscribe", (data: WebSocketSubscribeData) => {
        this.handleSubscribe(socket, data);
      });

      socket.on("unsubscribe", (data: WebSocketSubscribeData) => {
        this.handleUnsubscribe(socket, data);
      });

      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      socket.on("error", (error: Error) => {
        console.error(`WebSocket error for socket ${socket.id}:`, error);
      });
    });
  }

  private handleSubscribe(socket: Socket, data: WebSocketSubscribeData): void {
    const { trackingId } = data;

    if (!trackingId || typeof trackingId !== "string") {
      this.sendError(
        socket,
        "INVALID_TRACKING_ID",
        "Tracking ID is required and must be a string"
      );
      return;
    }

    if (!this.trackingIdToSockets.has(trackingId)) {
      this.trackingIdToSockets.set(trackingId, new Set());
    }

    this.trackingIdToSockets.get(trackingId)!.add(socket.id);

    const socketTrackingIds = this.socketToTrackingIds.get(socket.id);
    if (socketTrackingIds) {
      socketTrackingIds.add(trackingId);
    }

    socket.join(`tracking:${trackingId}`);

    this.sendAck(socket, `Subscribed to trackingId: ${trackingId}`);
    console.log(`Socket ${socket.id} subscribed to trackingId: ${trackingId}`);
  }

  private handleUnsubscribe(
    socket: Socket,
    data: WebSocketSubscribeData
  ): void {
    const { trackingId } = data;

    if (!trackingId) {
      this.sendError(socket, "INVALID_TRACKING_ID", "Tracking ID is required");
      return;
    }

    const sockets = this.trackingIdToSockets.get(trackingId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.trackingIdToSockets.delete(trackingId);
      }
    }

    const socketTrackingIds = this.socketToTrackingIds.get(socket.id);
    if (socketTrackingIds) {
      socketTrackingIds.delete(trackingId);
    }

    socket.leave(`tracking:${trackingId}`);

    this.sendAck(socket, `Unsubscribed from trackingId: ${trackingId}`);
    console.log(
      `Socket ${socket.id} unsubscribed from trackingId: ${trackingId}`
    );
  }

  private handleDisconnect(socket: Socket): void {
    console.log(`WebSocket client disconnected: ${socket.id}`);

    const trackingIds = this.socketToTrackingIds.get(socket.id);
    if (trackingIds) {
      trackingIds.forEach((trackingId) => {
        const sockets = this.trackingIdToSockets.get(trackingId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.trackingIdToSockets.delete(trackingId);
          }
        }
      });
    }

    this.socketToTrackingIds.delete(socket.id);
  }

  private sendError(
    socket: Socket,
    code: string,
    message: string,
    details?: any
  ): void {
    const errorMessage: WebSocketMessage<WebSocketErrorData> = {
      type: "error",
      data: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
    };
    socket.emit("error", errorMessage);
  }

  private sendAck(socket: Socket, message: string): void {
    const ackMessage: WebSocketMessage<string> = {
      type: "ack",
      data: message,
      timestamp: Date.now(),
    };
    socket.emit("ack", ackMessage);
  }

  public broadcastPaymentNotification(
    notification: PaymentNotificationData
  ): void {
    const { trackingId } = notification;

    const message: WebSocketMessage<PaymentNotificationData> = {
      type: "payment_notification",
      data: notification,
      timestamp: Date.now(),
    };

    this.io.to(`tracking:${trackingId}`).emit("payment", message);

    console.log(
      `Broadcasted payment notification for trackingId: ${trackingId} to ${
        this.trackingIdToSockets.get(trackingId)?.size || 0
      } clients`
    );
  }

  public getActiveConnectionsCount(): number {
    return this.io.sockets.sockets.size;
  }

  public getTrackingIdSubscribersCount(trackingId: string): number {
    return this.trackingIdToSockets.get(trackingId)?.size || 0;
  }

  public close(callback?: (err?: Error) => void): void {
    this.io.close(callback);
  }
}
