// services/message.service.ts
import { prisma } from "../lib/prisma";


export interface PaginatedMessages {
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    conversationId: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string;
      username: string;
      avatar: string | null;
    };
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ConversationInfo {
  id: string;
  name: string | null;
  isGroup: boolean;
  participants: Array<{
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  }>;
}

export async function getConversationMessages(
  conversationId: string,
  currentUserId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedMessages> {
  // First check if user is participant in this conversation
  const isParticipant = await prisma.participant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUserId,
        conversationId: conversationId,
      },
    },
  });

  if (!isParticipant) {
    throw new Error("User is not a participant in this conversation");
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  // Get total count of messages in conversation
  const totalMessages = await prisma.message.count({
    where: {
      conversationId: conversationId,
    },
  });

  // Get paginated messages (ordered by newest first)
  const messages = await prisma.message.findMany({
    where: {
      conversationId: conversationId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Newest first
    },
    skip: offset,
    take: limit,
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalMessages / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    messages,
    pagination: {
      currentPage: page,
      totalPages,
      totalMessages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export async function getOrCreateDirectConversation(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  // Find existing direct conversation between two users
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          userId: {
            in: [currentUserId, otherUserId],
          },
        },
      },
      AND: [
        {
          participants: {
            some: {
              userId: currentUserId,
            },
          },
        },
        {
          participants: {
            some: {
              userId: otherUserId,
            },
          },
        },
      ],
    },
    include: {
      participants: true,
    },
  });

  // Check if conversation has exactly 2 participants
  if (existingConversation && existingConversation.participants.length === 2) {
    return existingConversation.id;
  }

  // Create new direct conversation
  const newConversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      createdById: currentUserId,
      createdAt: new Date(),
      participants: {
        create: [
          {
            userId: currentUserId,
          },
          {
            userId: otherUserId,
          },
        ],
      },
    },
  });

  return newConversation.id;
}

export async function getConversationInfo(
  conversationId: string,
  currentUserId: string
): Promise<ConversationInfo | null> {
  // Check if user is participant
  const isParticipant = await prisma.participant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUserId,
        conversationId: conversationId,
      },
    },
  });

  if (!isParticipant) {
    return null;
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
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
    },
  });

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    name: conversation.name,
    isGroup: conversation.isGroup,
    participants: conversation.participants.map((p: { user: { id: string; name: string; username: string; avatar: string | null } }) => p.user),
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {

  const isParticipant = await prisma.participant.findUnique({
    where: {
      userId_conversationId: {
        userId: senderId,
        conversationId: conversationId,
      },
    },
  });

  if (!isParticipant) {
    throw new Error("User is not a participant in this conversation");
  }

  return await prisma.message.create({
    data: {
      content,
      senderId,
      conversationId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });
}