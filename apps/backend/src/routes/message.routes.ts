import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getConversationMessages,
  getDirectMessages,
  getConversationInfo,
  sendMessage,
} from "../controllers/messages.controller";

const router = Router();

// Get messages for a conversation (paginated)
router.get("/conversation/:conversationId/messages", authenticate, getConversationMessages);

// Get direct messages with a user (paginated, creates conversation if not exists)
router.get("/direct/:userId/messages", authenticate, getDirectMessages);

// Get conversation info (participants, etc.)
router.get("/conversation/:conversationId/info", authenticate, getConversationInfo);

// Send a message to a conversation
router.post("/conversation/:conversationId/messages", authenticate, sendMessage);

export default router; 