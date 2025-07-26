import { prisma } from "../lib/prisma";
import { broadcastToGroup } from "../socket/ws";



export async function createGroup({ name, creatorId, participantIds }: { name: string, creatorId: string, participantIds: string[] }) {
  // Creator is always admin
  const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
  const group = await prisma.conversation.create({
    data: {
      name,
      isGroup: true,
      createdById: creatorId,
      createdAt: new Date(),
      participants: {
        create: allParticipantIds.map(userId => ({
          userId,
          isAdmin: userId === creatorId,
        })),
      },
    },
    include: {
      participants: true,
    },
  });
  // Broadcast group creation to all members
  await broadcastToGroup(group.id, {
    type: "group:update",
    payload: {
      groupId: group.id,
      action: "created",
      groupInfo: group,
    },
  });
  return group;
}

export async function getGroupInfo(groupId: string, userId: string) {

  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId: groupId } },
  });
  if (!participant) throw new Error("Not a group member");
  return await prisma.conversation.findUnique({
    where: { id: groupId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      },
    },
  });
}

export async function updateGroupInfo(groupId: string, userId: string, data: { name?: string }) {
  // Only admins can update group info
  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId: groupId } },
  });
  if (!participant || !participant.isAdmin) throw new Error("Not an admin");
  const updated = await prisma.conversation.update({
    where: { id: groupId },
    data,
  });
  // Broadcast group info update
  await broadcastToGroup(groupId, {
    type: "group:update",
    payload: {
      groupId,
      action: "updated",
      groupInfo: updated,
      byUserId: userId,
    },
  });
  return updated;
}

export async function addParticipants(groupId: string, userId: string, newUserIds: string[]) {

  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId: groupId } },
  });
  if (!participant || !participant.isAdmin) throw new Error("Not an admin");
  // Avoid duplicates
  const existing = await prisma.participant.findMany({
    where: { conversationId: groupId, userId: { in: newUserIds } },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((p: { userId: string }) => p.userId));
  const toAdd = newUserIds.filter(id => !existingIds.has(id));
  const result = await prisma.participant.createMany({
    data: toAdd.map(userId => ({ userId, conversationId: groupId })),
    skipDuplicates: true,
  });
  // Broadcast add event
  for (const addedUserId of toAdd) {
    await broadcastToGroup(groupId, {
      type: "group:update",
      payload: {
        groupId,
        action: "added",
        userId: addedUserId,
        byUserId: userId,
      },
    });
  }
  return result;
}

export async function removeParticipant(groupId: string, adminId: string, removeUserId: string) {

  const admin = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId: adminId, conversationId: groupId } },
  });
  if (!admin || !admin.isAdmin) throw new Error("Not an admin");

  if (adminId === removeUserId) throw new Error("Use leave group to remove yourself");
  const result = await prisma.participant.delete({
    where: { userId_conversationId: { userId: removeUserId, conversationId: groupId } },
  });
  // Broadcast remove event
  await broadcastToGroup(groupId, {
    type: "group:update",
    payload: {
      groupId,
      action: "removed",
      userId: removeUserId,
      byUserId: adminId,
    },
  });
  return result;
}

export async function leaveGroup(groupId: string, userId: string) {

  const result = await prisma.participant.delete({
    where: { userId_conversationId: { userId, conversationId: groupId } },
  });
  // Broadcast leave event
  await broadcastToGroup(groupId, {
    type: "group:update",
    payload: {
      groupId,
      action: "left",
      userId,
    },
  });
  return result;
}

export async function listUserGroups(userId: string) {
  return await prisma.conversation.findMany({
    where: {
      isGroup: true,
      participants: { some: { userId } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      },
    },
  });
} 