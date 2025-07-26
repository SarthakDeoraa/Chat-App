// controllers/message.controller.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  getConversationMessages as getConversationMessagesService,
  getOrCreateDirectConversation,
  getConversationInfo as getConversationInfoService,
  sendMessage as sendMessageService,
} from "../services/messages.service";
import { broadcastToConversation } from "../socket/ws";

export async function getConversationMessages(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user?.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    if (page < 1) {
      return res.status(400).json({ error: "Page must be greater than 0" });
    }

    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: "Limit must be between 1 and 50" });
    }

    // Fetch messages
    const result = await getConversationMessagesService(
      conversationId,
      currentUserId,
      page,
      limit,
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[getConversationMessages error]", err);

    if (err.message === "User is not a participant in this conversation") {
      return res.status(403).json({
        error: "You are not a participant in this conversation",
        success: false,
      });
    }

    return res.status(500).json({
      error: "Something went wrong while fetching messages.",
      success: false,
    });
  }
}

export async function getDirectMessages(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user?.id;
    const { userId } = req.params; // The other user's ID
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validation
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (currentUserId === userId) {
      return res
        .status(400)
        .json({ error: "Cannot get messages with yourself" });
    }

    if (page < 1) {
      return res.status(400).json({ error: "Page must be greater than 0" });
    }

    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: "Limit must be between 1 and 50" });
    }

    // Get or create direct conversation
    const conversationId = await getOrCreateDirectConversation(
      currentUserId,
      userId,
    );

    // Fetch messages
    const result = await getConversationMessagesService(
      conversationId,
      currentUserId,
      page,
      limit,
    );

    return res.json({
      success: true,
      data: {
        conversationId,
        ...result,
      },
    });
  } catch (err: any) {
    console.error("[getDirectMessages error]", err);
    return res.status(500).json({
      error: "Something went wrong while fetching messages.",
      success: false,
    });
  }
}

export async function getConversationInfo(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user?.id;
    const { conversationId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const conversationInfo = await getConversationInfoService(
      conversationId,
      currentUserId,
    );

    if (!conversationInfo) {
      return res.status(404).json({
        error: "Conversation not found or you are not a participant",
        success: false,
      });
    }

    return res.json({
      success: true,
      data: conversationInfo,
    });
  } catch (err: any) {
    console.error("[getConversationInfo error]", err);
    return res.status(500).json({
      error: "Something went wrong while fetching conversation info.",
      success: false,
    });
  }
}

export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user?.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const message = await sendMessageService(
      conversationId,
      currentUserId,
      content.trim(),
    );

    // Broadcast to all participants in the conversation
    broadcastToConversation(conversationId, {
      type: "message:new",
      payload: {
        conversationId,
        message,
      },
    });

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err: any) {
    console.error("[sendMessage error]", err);

    if (err.message === "User is not a participant in this conversation") {
      return res.status(403).json({
        error: "You are not a participant in this conversation",
        success: false,
      });
    }

    return res.status(500).json({
      error: "Something went wrong while sending message.",
      success: false,
    });
  }
}
