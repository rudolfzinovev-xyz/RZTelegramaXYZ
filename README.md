# RZTelegrama

Ретро-мессенджер с физически-реалистичным интерфейсом: телетайп, дисковый телефон,
телефонная книга, папки с бумажками. Полноценный мессенджер с реальными
пользователями, сквозным шифрованием сообщений и голосовыми звонками через WebRTC —
не просто визуальный скин.

> **Лицензия:** проприетарная, source-available. Код открыт только для просмотра.
> Любое копирование, модификация, запуск и использование для обучения моделей —
> запрещены. См. [LICENSE](./LICENSE).

---

## Возможности

- **Аутентификация** — юзернейм + пароль, bcrypt-хэши, JWT-сессии (NextAuth).
- **Сквозное шифрование (E2EE)** — X25519 + XSalsa20-Poly1305 (tweetnacl). Приватный
  ключ шифруется паролем через PBKDF2-SHA256 и хранится только в зашифрованном виде.
- **Часовой пояс как «линия»** — для звонка надо подключить кабель к правильному
  каналу собеседника (UTC-12 … UTC+12).
- **Телетайп** — отправка и приём сообщений с анимацией «вылезающей ленты».
- **Дисковый телефон + WebRTC** — аудиозвонки peer-to-peer через Socket.io-сигналинг.
- **Папки** — бумажки с сообщениями раскладываются по папкам drag-and-drop.
- **Телефонная книга** — контакты, поиск, быстрый вызов.

## Стек

| Слой           | Технология                            |
| -------------- | ------------------------------------- |
| Frontend / SSR | Next.js 15 (App Router), React 18     |
| Стили          | Tailwind CSS 4 + Framer Motion        |
| ORM / БД       | Prisma + PostgreSQL 16                |
| Auth           | NextAuth.js (credentials)             |
| Realtime       | Socket.io поверх кастомного `server.js` |
| WebRTC         | simple-peer                           |
| Crypto         | tweetnacl, Web Crypto API (PBKDF2)    |

---

## Запуск для ознакомления

Запуск кода лицензией **не разрешён**; инструкции ниже приведены только для
понимания структуры проекта.

```bash
cp .env.example .env         # заполнить значения
docker compose up -d         # PostgreSQL
npx prisma migrate deploy
npm install
npm run dev                  # http://localhost:3000
```

### Обязательные переменные окружения

См. [.env.example](./.env.example):

- `DATABASE_URL` — строка подключения к PostgreSQL.
- `NEXTAUTH_SECRET` — случайная строка ≥ 32 байт (`openssl rand -base64 32`).
- `NEXTAUTH_URL` — публичный URL приложения.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — для docker-compose.

---

## Структура

```
app/
  (auth)/          # login / register
  api/             # REST: users, messages, folders, me/keys, auth
  desk/            # главный интерфейс (стол)
components/
  teletype/        # телетайп, коммутатор, лента, печатная машинка
  phone/           # дисковый телефон, диск набора, модалка звонка
  phonebook/       # телефонная книга
  folder/          # папки и бумажки
  desk/            # часы, корзина, плеер, недозвоны
lib/
  auth.ts          # NextAuth options
  crypto.ts        # E2EE: keygen, encrypt, decrypt, PBKDF2
  prisma.ts        # Prisma singleton
  socket.ts        # Socket.io client
  useWebRTC.ts     # хук WebRTC-звонков
prisma/
  schema.prisma
server.js          # кастомный Next.js + Socket.io сервер
```

---

## Безопасность

- Приватные ключи пользователей **никогда** не видны серверу в открытом виде.
- Сервер хранит только зашифрованный `encryptedPrivateKey` + `nonce` + `salt`.
- Сообщения в БД — зашифрованные блобы (`content` + `nonce`), сервер не читает.
- Пароли хэшируются bcrypt (10 раундов).
- Все REST-эндпоинты защищены сессией; WebSocket-события привязаны к
  авторизованному `socket.data.userId`.

---

## Лицензия

Copyright © 2026 Rudolf1517. Все права защищены.

Этот репозиторий распространяется под лицензией **PolyForm Strict 1.0.0**.
Полный текст — в файле [LICENSE](./LICENSE).

Коротко: разрешён просмотр и личное некоммерческое изучение.
Запрещены: распространение, модификация, коммерческое использование, запуск в production.
Для любого другого использования — обращайтесь к правообладателю.
