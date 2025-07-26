// services/user.service.ts
import { prisma } from "../lib/prisma";

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      avatar: true,
    },
  });
}

export async function getUserConversations(currentUserId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId: currentUserId,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [
      {
        messages: {
          _count: "desc",
        },
      },
    ],
  });

  // Format conversations for frontend
  return conversations.map((conv) => ({
    id: conv.id,
    name: conv.name,
    isGroup: conv.isGroup,
    participants: conv.participants
      .filter((p) => p.userId !== currentUserId)
      .map((p) => p.user),
    lastMessage: conv.messages[0] || null,
    messageCount: conv._count.messages,
    // For direct chats, use the other participant's name as conversation name
    displayName: conv.isGroup
      ? conv.name
      : conv.participants.find((p) => p.userId !== currentUserId)?.user.name ||
        "Unknown",
  }));
}
