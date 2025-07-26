import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  createGroup,
  getGroupInfo,
  updateGroupInfo,
  addParticipants,
  removeParticipant,
  leaveGroup,
  listUserGroups,
} from "../services/groups.service";

export async function createGroupController(req: AuthRequest, res: Response) {
  try {
    const { name, participantIds } = req.body;
    const creatorId = req.user!.id;
    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: "Invalid request" });
    }
    const group = await createGroup({ name, creatorId, participantIds });
    res.status(201).json(group);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getGroupInfoController(req: AuthRequest, res: Response) {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    const userId = req.user!.id;
    const group = await getGroupInfo(groupId, userId);
    res.json(group);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}

export async function updateGroupInfoController(req: AuthRequest, res: Response) {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    const userId = req.user!.id;
    const { name } = req.body;
    const group = await updateGroupInfo(groupId, userId, { name });
    res.json(group);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}

export async function addParticipantsController(req: AuthRequest, res: Response) {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    const userId = req.user!.id;
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds must be an array" });
    }
    const result = await addParticipants(groupId, userId, userIds);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}

export async function removeParticipantController(req: AuthRequest, res: Response) {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    const adminId = req.user!.id;
    const removeUserId = req.params.userId;
    if (!removeUserId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const result = await removeParticipant(groupId, adminId, removeUserId);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
}

export async function leaveGroupController(req: AuthRequest, res: Response) {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    const userId = req.user!.id;
    const result = await leaveGroup(groupId, userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function listUserGroupsController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const groups = await listUserGroups(userId);
    res.json(groups);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
} 