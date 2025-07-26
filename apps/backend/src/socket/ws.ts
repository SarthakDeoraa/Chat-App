import { WebSocketServer, WebSocket, RawData } from "ws";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import { Server } from "http";

interface MyWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

const userSockets = new Map<string, MyWebSocket>();
const onlineUsers = new Set<string>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  // Heartbeat every 30 sec
  setInterval(() => {
    wss.clients.forEach((ws: MyWebSocket) => {
      if (!ws.isAlive) {
        ws.terminate();
        handleDisconnect(ws);
      } else {
        ws.isAlive = false;
        ws.ping();
      }
    });
  }, 30000);

  wss.on("connection", (ws: MyWebSocket) => {
    ws.isAlive = true;
    ws.on("pong", () => ws.isAlive = true);

    // Auth timeout if token not sent in 10 sec
    const authTimeout = setTimeout(() => {
      if (!ws.userId) ws.close(4002, "No token provided");
    }, 10000);

    // Wait for first message (token)
    ws.once("message", async (data) => {
      clearTimeout(authTimeout);

      try {
        const { token } = JSON.parse(data.toString());
        const { userId } = verifyToken(token) as { userId: string };

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return ws.close(4001, "User not found");

        // Close old socket if user already connected
        const existing = userSockets.get(userId);
        if (existing) existing.close(4004, "Reconnected");

        ws.userId = userId;
        userSockets.set(userId, ws);
        onlineUsers.add(userId);

        ws.send(JSON.stringify({ type: "auth:success" }));

        sendOnlineFriends(ws);
        notifyFriendsOnlineStatus(userId, true);

        ws.on("message", (data) => handleMessage(ws, data));
        ws.on("close", () => handleDisconnect(ws));
        ws.on("error", () => handleDisconnect(ws));

      } catch (err) {
        ws.close(4000, "Invalid token");
      }
    });
  });
}

async function handleMessage(ws: MyWebSocket, data: RawData) {
  if (!ws.userId) return;

  try {
    const { type, payload } = JSON.parse(data.toString());

    if (type === "typing:start" || type === "typing:stop") {
      const { conversationId } = payload;

      const isParticipant = await prisma.participant.findUnique({
        where: { userId_conversationId: { userId: ws.userId, conversationId } },
      });

      if (!isParticipant) return;

      const others = await prisma.participant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

      const msg = JSON.stringify({
        type: "typing:update",
        payload: {
          userId: ws.userId,
          conversationId,
          isTyping: type === "typing:start",
        },
      });

      others
        .filter(({ userId }) => userId !== ws.userId)
        .forEach(({ userId }) => {
          const userWs = userSockets.get(userId);
          if (userWs?.readyState === WebSocket.OPEN) userWs.send(msg);
        });
    }

  } catch (err) {
    console.error("Invalid message", err);
  }
}

function handleDisconnect(ws: MyWebSocket) {
  if (!ws.userId) return;
  userSockets.delete(ws.userId);
  onlineUsers.delete(ws.userId);
  notifyFriendsOnlineStatus(ws.userId, false);
}

async function notifyFriendsOnlineStatus(userId: string, isOnline: boolean) {
  const conversations = await prisma.participant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const conversationIds = conversations.map(c => c.conversationId);

  const friends = await prisma.participant.findMany({
    where: { conversationId: { in: conversationIds } },
    select: { userId: true },
  });

  const message = JSON.stringify({
    type: isOnline ? "user:online" : "user:offline",
    payload: { userId },
  });

  friends
    .filter(f => f.userId !== userId)
    .forEach(f => {
      const ws = userSockets.get(f.userId);
      if (ws?.readyState === WebSocket.OPEN) ws.send(message);
    });
}

async function sendOnlineFriends(ws: MyWebSocket) {
  if (!ws.userId) return;

  const conversations = await prisma.participant.findMany({
    where: { userId: ws.userId },
    select: { conversationId: true },
  });

  const friends = await prisma.participant.findMany({
    where: {
      conversationId: { in: conversations.map(c => c.conversationId) },
    },
    select: { userId: true },
  });

  const online = friends
    .map(f => f.userId)
    .filter(id => id !== ws.userId && onlineUsers.has(id));

  ws.send(JSON.stringify({
    type: "users:online",
    payload: { onlineUserIds: online },
  }));
}

// Export functions for broadcasting messages
export async function broadcastToConversation(conversationId: string, messageObj: any) {
  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  const message = JSON.stringify(messageObj);
  
  participants.forEach(({ userId }) => {
    const ws = userSockets.get(userId);
    if (ws?.readyState === WebSocket.OPEN) ws.send(message);
  });
}

export const broadcastToGroup = broadcastToConversation;

// Utility functions
export const isUserOnline = (userId: string) => onlineUsers.has(userId);
export const getOnlineUsers = () => Array.from(onlineUsers);
export const getConnectedSocketCount = () => userSockets.size;