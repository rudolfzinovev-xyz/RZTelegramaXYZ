import { prisma } from "./prisma";

export interface BotIdentity {
  botId: string;
  name: string;
  username: string;
}

// Resolve a bearer token from `Authorization: Bearer <token>` header.
// Returns null if missing/invalid/no associated bot.
export async function resolveBotFromAuth(authHeader: string | null): Promise<BotIdentity | null> {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/.exec(authHeader.trim());
  if (!m) return null;
  const token = m[1];

  const row = await prisma.botToken.findUnique({
    where: { token },
    include: {
      bot: { select: { id: true, name: true, username: true, isBot: true } },
    },
  });
  if (!row || !row.bot.isBot) return null;
  return { botId: row.bot.id, name: row.bot.name, username: row.bot.username };
}
