import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { OnModuleInit } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { notificationEvents$ } from "../../services/notification/notification-dispatch.service";

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    // Subscribe to the shared RxJS event stream and dispatch to room
    notificationEvents$.subscribe((notification) => {
      if (this.server) {
        this.server.to(notification.recipientId).emit("notification", notification);
      }
    });
  }

  async handleConnection(client: any) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      // Parse mock token
      const username = token.replace("mock_token_for_", "");
      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user) {
        client.disconnect();
        return;
      }

      // Join the user's unique room
      client.join(user.id);
      console.log(`[WS CONNECT] User ${user.username} joined room: ${user.id}`);
    } catch (e: any) {
      console.error("[WS CONNECT ERROR]", e.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    console.log(`[WS DISCONNECT] Client disconnected`);
  }
}
