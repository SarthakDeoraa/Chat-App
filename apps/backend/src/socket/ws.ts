import { WebSocketServer } from "ws";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import { Server } from "http";



// Map userId to WebSocket
const userSockets = new Map<string, any>();
// Track online users
const onlineUsers = new Set<string>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    let authenticatedUserId: string | null = null;
    ws.once("message", async (data) => {
      try {
        const { token } = JSON.parse(data.toString());
        const payload = verifyToken(token);
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
          ws.close(4001, "Invalid user");
          return;
        }
        authenticatedUserId = user.id;
        userSockets.set(user.id, ws);
        onlineUsers.add(user.id);
        ws.send(JSON.stringify({ type: "auth:success" }));

        // Send current online status to the newly connected user
        await sendOnlineStatusToUser(user.id, ws);

        // Broadcast online status to contacts and group members
        await broadcastOnlineStatus(user.id, true);

        // Listen for further messages (typing, etc.)
        ws.on("message", async (msg) => {
          if (!authenticatedUserId) return;
          let parsed;
          try {
            parsed = JSON.parse(msg.toString());
          } catch (e) {
            return;
          }
          if (!parsed.type || !parsed.payload) return;

          if (parsed.type === "typing:start" || parsed.type === "typing:stop") {
            const { conversationId } = parsed.payload;
            if (!conversationId) return;
            // Check if user is a participant
            const isParticipant = await prisma.participant.findUnique({
              where: { userId_conversationId: { userId: authenticatedUserId, conversationId } },
            });
            if (!isParticipant) return;
            // Broadcast to all other participants
            const participants = await prisma.participant.findMany({
              where: { conversationId },
              select: { userId: true },
            });
            for (const { userId } of participants) {
              if (userId === authenticatedUserId) continue;
              const otherWs = userSockets.get(userId);
              if (otherWs && otherWs.readyState === otherWs.OPEN) {
                otherWs.send(JSON.stringify({
                  type: "typing:update",
                  payload: {
                    conversationId,
                    userId: authenticatedUserId,
                    isTyping: parsed.type === "typing:start",
                  },
                }));
              }
            }
          }
        });
      } catch (err) {
        ws.close(4000, "Invalid token");
      }
    });
    ws.on("close", async () => {
      if (authenticatedUserId) {
        userSockets.delete(authenticatedUserId);
        onlineUsers.delete(authenticatedUserId);
        // Broadcast offline status
        await broadcastOnlineStatus(authenticatedUserId, false);
      }
    });
  });
}

async function broadcastOnlineStatus(userId: string, isOnline: boolean) {
  // Get all users who have conversations with this user
  const conversations = await prisma.participant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const conversationIds = conversations.map((c: any) => c.conversationId);
  
  // Get all participants in these conversations
  const participants = await prisma.participant.findMany({
    where: { conversationId: { in: conversationIds } },
    select: { userId: true },
  });
  
  // Broadcast to all participants (except the user themselves)
  for (const { userId: participantId } of participants) {
    if (participantId === userId) continue;
    const ws = userSockets.get(participantId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: isOnline ? "user:online" : "user:offline",
        payload: { userId },
      }));
    }
  }
}

async function sendOnlineStatusToUser(userId: string, ws: any) {
  const conversations = await prisma.participant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const conversationIds = conversations.map((c: any) => c.conversationId);

  const onlineUserIds = Array.from(onlineUsers);

  ws.send(JSON.stringify({
    type: "users:online",
    payload: {
      userId,
      onlineUserIds,
    },
  }));
}

export async function broadcastToConversation(conversationId: string, messageObj: any) {
  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  for (const { userId } of participants) {
    const ws = userSockets.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(messageObj));
    }
  }
} 

export async function broadcastToGroup(groupId: string, eventObj: any) {
  // groupId is the conversationId for group chats
  const participants = await prisma.participant.findMany({
    where: { conversationId: groupId },
    select: { userId: true },
  });
  for (const { userId } of participants) {
    const ws = userSockets.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(eventObj));
    }
  }
} 