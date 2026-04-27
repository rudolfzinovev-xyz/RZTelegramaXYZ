import { prisma } from "./prisma";

// Returns true if `targetUserId` has blocked `senderUserId`.
// Used to gate message delivery and call routing.
export async function isBlocked(senderUserId: string, targetUserId: string): Promise<boolean> {
  if (!senderUserId || !targetUserId || senderUserId === targetUserId) return false;
  const row = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: targetUserId, blockedId: senderUserId } },
    select: { id: true },
  });
  return !!row;
}
