import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  createGroupController,
  getGroupInfoController,
  updateGroupInfoController,
  addParticipantsController,
  removeParticipantController,
  leaveGroupController,
  listUserGroupsController,
} from "../controllers/groups.controller";

const router = Router();

// Create a new group
router.post("/", authenticate, createGroupController);

// Get info for a group
router.get("/:groupId", authenticate, getGroupInfoController);

// Update group info (admin only)
router.patch("/:groupId", authenticate, updateGroupInfoController);

// Add participants (admin only)
router.post("/:groupId/participants", authenticate, addParticipantsController);

// Remove participant (admin only)
router.delete("/:groupId/participants/:userId", authenticate, removeParticipantController);

// Leave group
router.post("/:groupId/leave", authenticate, leaveGroupController);

// List all groups for the user
router.get("/", authenticate, listUserGroupsController);

export default router; 