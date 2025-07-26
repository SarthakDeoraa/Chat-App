// controllers/user.controller.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getUserById, getUserConversations } from "../services/user.service";

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    console.error("[getMe error]", err);
    return res
      .status(500)
      .json({ error: "Something went wrong while fetching user." });
  }
}

export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversations = await getUserConversations(currentUserId);
    return res.json(conversations);
  } catch (err: any) {
    console.error("[getAllUsers error]", err);
    return res
      .status(500)
      .json({ error: "Something went wrong while fetching conversations." });
  }
}
