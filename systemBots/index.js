// Registry for built-in system bots. Each bot is a regular User row
// (isBot=true) that exists in DB so it appears in the bot book and can
// receive messages, but its message-handling logic is JS code in this
// repo — no external process, no Python, no token.

const moderator = require("./moderator");

const BOTS = [moderator];

// Idempotent — call on every server.js startup. Creates User rows for
// any system bot that doesn't exist yet, refreshes name/bio/line for
// the rest.
async function ensureSystemBots(prisma) {
  for (const bot of BOTS) {
    await prisma.user.upsert({
      where: { id: bot.id },
      update: {
        name: bot.name,
        username: bot.username,
        bio: bot.bio ?? null,
        line: bot.line ?? 0,
        isBot: true,
      },
      create: {
        id: bot.id,
        username: bot.username,
        name: bot.name,
        phone: `bot:${bot.id}`,
        timezone: "UTC+0",
        line: bot.line ?? 0,
        bio: bot.bio ?? null,
        passwordHash: null,
        isBot: true,
        botOwnerId: null,
      },
    });
  }
}

function getSystemBotById(id) {
  return BOTS.find(b => b.id === id);
}

function listSystemBotIds() {
  return BOTS.map(b => b.id);
}

module.exports = { ensureSystemBots, getSystemBotById, listSystemBotIds };
