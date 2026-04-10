# Backend Agent Context

You are working on the **NestJS backend** (`packages/backend/`).

## Stack
- NestJS + Fastify adapter (NOT Express)
- Prisma ORM with PostgreSQL 16
- Redis 7 (cache, pub/sub, rate limiting)
- Socket.io WebSocket gateway
- BullMQ job queues
- Jest for testing

## Key Patterns
- Multi-tenant: every query must filter by `tenantId`
- All API controllers use `@Controller('api/...')` prefix
- Auth: JWT for tenant admins, separate SuperAdmin JWT with `isSuperAdmin: true`
- Casino webhooks use HMAC-SHA256 signature verification via `ApiKeyGuard`
- Feature gating by tenant tier (BASIC < SOCIAL < ENGAGE < MONETIZE)
- Permission guard checks `TenantPermission[]` array, OWNER bypasses all
- BigInt fields (like `sequenceNum`) must be serialized to string before JSON response
- Prisma `$queryRaw` returns `bigint` for COUNT — convert with `Number()`

## Module Structure
Each module: `module.ts`, `controller.ts`, `service.ts`, `*.dto.ts`
Tests co-located: `chat.service.spec.ts` next to `chat.service.ts`

## Common Gotchas
- Fastify requires `@fastify/static` for Swagger UI
- Redis adapter setup may fail in single-instance mode — wrapped in try/catch
- `nest start --watch` must run from `packages/backend/` directory
- Query params from HTTP are strings — parse with `Number()` or `parseInt()`

## Database
- Schema: `prisma/schema.prisma` (16 models, 14 enums)
- Seed: `prisma/seed.ts`
- Migrate: `npx prisma db push` (dev) or `npx prisma migrate deploy` (prod)

## API Route Structure
All tenant-scoped endpoints follow: `/api/tenants/:tenantId/<resource>`
- Channels: `/api/tenants/:tenantId/channels`
- Players: `/api/tenants/:tenantId/players`
- Moderation: `/api/tenants/:tenantId/moderation/action`, `banned-words`, `reports`, `logs`
- Chat messages: `/api/tenants/:tenantId/channels/:channelId/messages`
- Promos: `/api/tenants/:tenantId/promos`
- Trivia: `/api/tenants/:tenantId/trivia`
- Rain: `/api/tenants/:tenantId/rain`
- Leaderboard: `/api/tenants/:tenantId/leaderboard`
- Analytics: `/api/tenants/:tenantId/analytics/overview`, `messages`, `players`

Super admin endpoints: `/api/super-admin/...` (tenants CRUD, dashboard, auth)
Auth: `/api/auth/login` (unified — handles both TenantAdmin and SuperAdmin)
Webhooks: `/api/webhooks/incoming` (casino→chat, HMAC-signed)
Dev: `/api/self-test/player-token` (POST, dev-only — generates player JWT for testing)

## REST → WebSocket Bridge
Messages sent via REST API (`POST /api/tenants/:tid/channels/:cid/messages`) are automatically broadcast to WebSocket clients via `chatGateway.broadcastMessage()`. This means admin messages from Live Chat appear instantly in the widget.

## Gateway Admin Auth
The WebSocket gateway accepts admin JWTs (tokens with `role` + `email` fields, no `externalId`). Admins connect as level-99 moderators, bypass mute/ban/rate-limit checks, and their messages use `source: OPERATOR` with `playerId: null`.

## Feature Tier Gating
Tenant tier controls which features are available:
- BASIC: Text chat, channels, moderation
- SOCIAL: + Win cards, reactions, GIFs, emojis, player profiles
- ENGAGE: + Levels/badges, rain, promos, leaderboard, trivia
- MONETIZE: + Tipping
Use `@RequireFeature(FeatureKey.X)` + `FeatureGateGuard` to gate endpoints by tier.

## WebSocket Events & Payloads
Client→Server:
- `chat:message` → `{ channelId, text, replyTo? }`
- `chat:reaction` → `{ messageId, emoji }`
- `chat:typing` → `{ channelId }`
- `channel:join` → `{ channelId }`
- `channel:leave` → `{ channelId }`
- `rain:claim` → `{ rainEventId }`
- `trivia:answer` → `{ triviaId, answerIndex }`
- `tip:send` → `{ targetPlayerId, amount, currency }`
- `mod:delete` → `{ messageId }` (mod only)
- `mod:mute` → `{ playerId, duration }` (mod only)

Server→Client:
- `chat:message` → `{ id, channelId, player, type, content, timestamp }`
- `chat:delete` → `{ messageId }`
- `chat:reaction` → `{ messageId, emoji, count }`
- `player:join` → `{ channelId, player, onlineCount }`
- `player:leave` → `{ channelId, playerId, onlineCount }`
- `rain:start` → `{ id, amount, currency, duration, playerCount }`
- `rain:end` → `{ id, claimants, perPlayer }`
- `trivia:start` → `{ id, question, options, duration }`
- `trivia:end` → `{ id, correctIndex, winner }`
- `win:share` → `{ player, game, bet, win, multiplier, currency }`
- `config:update` → `{ features, channels, theme }`
- `error` → `{ code, message }`

## Casino Integration API (casino's backend → our API)
These are HMAC-signed with X-API-Key + X-API-Secret:
- `POST /api/webhooks/incoming` with event types: `player.win`, `player.updated`, `player.deposit`, `player.status`, `rain.triggered`

Outbound webhooks (we → casino):
- Rain reward claimed → casino credits player
- Trivia winner → casino awards prize
- Tip transaction → casino debits sender, credits receiver
- Player reported → casino gets notification

## Content Filtering Pipeline (message validation order)
1. Rate limit (Redis sliding window: 1 msg/sec, 30 msg/min — configurable)
2. Banned words filter (exact, wildcard, regex — per-tenant, cached in Redis)
3. Spam detection (duplicate hash vs last 10 msgs, URL filtering, repeated chars)
4. Flood protection (3 rate-limit violations in 5min → auto-mute 5min, escalating)

## Redis Key Patterns
- `{tenant}:ch:{id}:msgs` — List (capped 200) — message buffer
- `{tenant}:ch:{id}:presence` — Sorted Set (score=timestamp) — online users, 30s expiry
- `{tenant}:player:{id}:rate` — String counter — 1s TTL
- `{tenant}:player:{id}:session` — Hash — 24h TTL
- `{tenant}:rain:{id}:claims` — Set — 5min TTL
- `{tenant}:trivia:{id}:answers` — Hash — 2min TTL
- `{tenant}:config` — Hash — 5min TTL (cached tenant config + features)
- `{tenant}:banned_words` — Set — 5min TTL

## Ports
- Backend: 3000
- PostgreSQL: 5434
- Redis: 6381
