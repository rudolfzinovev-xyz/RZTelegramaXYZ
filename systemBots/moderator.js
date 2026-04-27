// System bot: modератор. Lives inside the main Node process — no token,
// no Python, no HTTP. The dispatcher in server.js calls handle() with
// the prisma client, the incoming message, and a send() helper that
// emits replies through the same delivery path as user-bot messages.

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) return "+7" + digits.slice(1);
  if (digits.length >= 10) return "+" + digits;
  return String(raw || "");
}

const HELP = (
  "Привет! Я модератор. Помогаю не получать спам.\n" +
  "\n" +
  "Команды:\n" +
  "  /help — это сообщение\n" +
  "  /block <телефон> — больше не получать сообщения и звонки от этого абонента\n" +
  "  /unblock <телефон> — снять блокировку\n" +
  "  /list — показать кого ты заблокировал\n" +
  "\n" +
  "Пример: /block +77001234567\n" +
  "Список ведётся для тебя лично, никто другой его не видит."
);

async function handle({ prisma, message, send }) {
  const text = String(message.content || "").trim();
  const parts = text.split(/\s+/, 2);
  const cmd = (parts[0] || "").toLowerCase();
  const arg = text.slice(parts[0]?.length || 0).trim();
  const senderId = message.senderId;

  if (!cmd.startsWith("/") || cmd === "/help" || cmd === "/start") {
    await send(HELP);
    return;
  }

  if (cmd === "/list") {
    const blocks = await prisma.block.findMany({
      where: { blockerId: senderId },
      include: { blocked: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (!blocks.length) {
      await send("Список блокировок пуст.");
      return;
    }
    const lines = blocks.map(b => `  • ${b.blocked.name} (${b.blocked.phone})`).join("\n");
    await send("Твой список блокировок:\n" + lines);
    return;
  }

  if (cmd === "/block" || cmd === "/unblock") {
    if (!arg) {
      await send(`Укажи телефон: ${cmd} +77001234567`);
      return;
    }
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { phone: true },
    });
    const phone = normalizePhone(arg);
    if (sender && phone === sender.phone) {
      await send("Это твой собственный номер.");
      return;
    }
    const target = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, phone: true, isBot: true },
    });
    if (!target) {
      await send("Абонент с таким номером не найден.");
      return;
    }
    if (target.isBot) {
      await send("Нельзя блокировать ботов.");
      return;
    }

    if (cmd === "/block") {
      await prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: senderId, blockedId: target.id } },
        update: {},
        create: { blockerId: senderId, blockedId: target.id },
      });
      await send(`Заблокирован: ${target.name} (${target.phone})\nТы больше не получишь от него ни сообщений, ни звонков.`);
    } else {
      await prisma.block.deleteMany({ where: { blockerId: senderId, blockedId: target.id } });
      await send(`Разблокирован: ${target.name} (${target.phone})`);
    }
    return;
  }

  await send(`Неизвестная команда: ${cmd}\nНаберите /help, чтобы увидеть список.`);
}

module.exports = {
  id: "sys_moderator",
  username: "moderator",
  name: "Модератор",
  bio: "/help · /block · /unblock · /list",
  line: 0,
  handle,
};
